// analytics-digest — daily owner analytics email.
// Hybrid sources: Postgres (authoritative counts) + PostHog (engagement) + Sentry (stability).
// Delivery: Gmail SMTP (Spacemail blocks cloud IPs; Gmail is reachable from the edge runtime).
//
// Auth: shared secret (verify_jwt = false). pg_cron sends `Authorization: Bearer <DIGEST_CRON_SECRET>`;
// manual runs may pass `x-digest-secret: <DIGEST_CRON_SECRET>`.
// Modes (?mode=): digest (default) | smtp-test | port-test.  ?to= overrides recipient (testing).
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";
import { Client as PgClient } from "https://deno.land/x/postgres@v0.19.3/mod.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-digest-secret, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const env = (k: string) => Deno.env.get(k) ?? "";
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b, (_k, v) => (typeof v === "bigint" ? Number(v) : v)), {
    status: s,
    headers: { ...cors, "Content-Type": "application/json" },
  });

// ── email ──────────────────────────────────────────────────────────────────
async function sendMail(to: string, subject: string, html: string) {
  const port = Number(env("SMTP_PORT") || "465");
  const client = new SMTPClient({
    connection: {
      hostname: env("SMTP_HOST"),
      port,
      tls: port === 465,
      auth: { username: env("SMTP_USER"), password: env("SMTP_PASSWORD") },
    },
  });
  try {
    await client.send({ from: env("DIGEST_FROM_EMAIL"), to, subject, html, content: "auto" });
  } finally {
    await client.close();
  }
}

// ── time window: "yesterday" and the day before, in the owner's timezone ─────
function zonedMidnightUTC(dateStr: string, tz: string): number {
  const base = new Date(dateStr + "T00:00:00Z");
  const asUTC = new Date(base.toLocaleString("en-US", { timeZone: "UTC" }));
  const asTZ = new Date(base.toLocaleString("en-US", { timeZone: tz }));
  return base.getTime() + (asUTC.getTime() - asTZ.getTime());
}
function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
function windows(tz: string) {
  const todayStr = new Date().toLocaleDateString("en-CA", { timeZone: tz }); // YYYY-MM-DD
  const yStr = addDays(todayStr, -1);
  const pStr = addDays(todayStr, -2);
  const y0 = zonedMidnightUTC(yStr, tz);
  const y1 = zonedMidnightUTC(todayStr, tz);
  const p0 = zonedMidnightUTC(pStr, tz);
  const p1 = y0;
  return { yStr, y0, y1, p0, p1 };
}
const sec = (ms: number) => Math.floor(ms / 1000);
const iso = (ms: number) => new Date(ms).toISOString();

// ── Postgres counts via PostgREST (service role) ─────────────────────────────
async function pgCount(table: string, filters: string[] = []): Promise<number | null> {
  const url = `${env("SUPABASE_URL")}/rest/v1/${table}?select=user_id${filters.length ? "&" + filters.join("&") : ""}`;
  const res = await fetch(url, {
    headers: {
      apikey: env("SUPABASE_SERVICE_ROLE_KEY"),
      Authorization: `Bearer ${env("SUPABASE_SERVICE_ROLE_KEY")}`,
      Prefer: "count=exact",
      Range: "0-0",
    },
  });
  const cr = res.headers.get("content-range"); // "0-0/1234" or "*/0"
  if (!cr) return null;
  const total = cr.split("/")[1];
  return total === "*" ? 0 : Number(total);
}

// ── PostHog HogQL ────────────────────────────────────────────────────────────
async function hogql(query: string): Promise<unknown[][]> {
  const res = await fetch(`${env("POSTHOG_HOST")}/api/projects/${env("POSTHOG_PROJECT_ID")}/query/`, {
    method: "POST",
    headers: { Authorization: `Bearer ${env("POSTHOG_PERSONAL_API_KEY")}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query: { kind: "HogQLQuery", query } }),
  });
  const d = await res.json();
  if (!d.results) throw new Error("posthog: " + JSON.stringify(d).slice(0, 200));
  return d.results;
}

// ── Sentry ───────────────────────────────────────────────────────────────────
async function sentryTopIssues(): Promise<{ title: string; count: string; url: string }[]> {
  const u = `${env("SENTRY_HOST")}/api/0/projects/${env("SENTRY_ORG")}/${env("SENTRY_PROJECT")}/issues/?statsPeriod=24h&query=is:unresolved&sort=freq&limit=5`;
  const res = await fetch(u, { headers: { Authorization: `Bearer ${env("SENTRY_AUTH_TOKEN")}` } });
  const d = await res.json();
  if (!Array.isArray(d)) return [];
  return d.map((i: Record<string, unknown>) => ({
    title: String(i.title ?? i.metadata ?? "issue"),
    count: String(i.count ?? "?"),
    url: String(i.permalink ?? "#"),
  }));
}

// ── html helpers ─────────────────────────────────────────────────────────────
const num = (n: number | null) => (n === null ? "—" : n.toLocaleString("en-GB"));
function delta(cur: number | null, prev: number | null): string {
  if (cur === null || prev === null) return "";
  const d = cur - prev;
  if (d === 0) return `<span style="color:#888"> · flat</span>`;
  const up = d > 0;
  return `<span style="color:${up ? "#16a34a" : "#dc2626"}"> · ${up ? "▲" : "▼"} ${up ? "+" : ""}${d}</span>`;
}
function tile(label: string, cur: number | null, prev: number | null) {
  return `<td style="padding:10px 14px;background:#111;border:1px solid #222;border-radius:10px;vertical-align:top">
    <div style="font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:#f97316;font-weight:700">${label}</div>
    <div style="font-size:30px;font-weight:800;color:#fff;line-height:1.1;margin-top:4px">${num(cur)}${delta(cur, prev)}</div>
    <div style="font-size:11px;color:#777;margin-top:2px">prev day: ${num(prev)}</div>
  </td>`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  const secret = env("DIGEST_CRON_SECRET");
  const provided =
    req.headers.get("x-digest-secret") ?? (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!secret || provided !== secret) return json({ error: "unauthorized" }, 401);

  const url = new URL(req.url);
  const mode = url.searchParams.get("mode") ?? "digest";

  if (mode === "port-test") {
    const host = url.searchParams.get("host") || env("SMTP_HOST");
    const port = Number(url.searchParams.get("port") || env("SMTP_PORT") || "465");
    const t = Date.now();
    try {
      const c = (await Promise.race([
        Deno.connect({ hostname: host, port }),
        new Promise((_, r) => setTimeout(() => r(new Error("connect timeout 10s")), 10000)),
      ])) as Deno.Conn;
      c.close();
      return json({ ok: true, host, port, ms: Date.now() - t });
    } catch (e) {
      return json({ ok: false, host, port, error: String((e as Error)?.message ?? e) }, 500);
    }
  }

  if (mode === "smtp-test") {
    const to = url.searchParams.get("to") || env("DIGEST_FROM_EMAIL");
    try {
      await sendMail(to, "HIIT analytics — SMTP smoke test", `<p>SMTP works ✅</p>`);
      return json({ ok: true, to });
    } catch (e) {
      return json({ ok: false, error: String((e as Error)?.message ?? e) }, 500);
    }
  }

  if (mode === "install-cron" || mode === "cron-status") {
    const db = new PgClient(env("SUPABASE_DB_URL"));
    await db.connect();
    try {
      if (mode === "install-cron") {
        const endpoint = `${env("SUPABASE_URL")}/functions/v1/analytics-digest?mode=digest`;
        const schedule = url.searchParams.get("schedule") || "0 6 * * *"; // 06:00 UTC = 07:00 Europe/London (BST)
        await db.queryArray(`create extension if not exists pg_cron;`);
        await db.queryArray(`create extension if not exists pg_net;`);
        const existing = await db.queryObject<{ id: string }>(
          `select id from vault.secrets where name = 'analytics_digest_cron_secret'`,
        );
        if (existing.rows.length) {
          await db.queryArray`select vault.update_secret(${existing.rows[0].id}::uuid, ${env("DIGEST_CRON_SECRET")})`;
        } else {
          await db.queryArray`select vault.create_secret(${env("DIGEST_CRON_SECRET")}, 'analytics_digest_cron_secret', 'Bearer for analytics-digest edge fn')`;
        }
        await db.queryArray(`do $$ begin
          if exists (select 1 from cron.job where jobname='analytics_digest_daily') then
            perform cron.unschedule('analytics_digest_daily');
          end if; end $$;`);
        const cmd = `select net.http_post(url:='${endpoint}',headers:=jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||(select decrypted_secret from vault.decrypted_secrets where name='analytics_digest_cron_secret')),body:='{}'::jsonb);`;
        await db.queryArray`select cron.schedule('analytics_digest_daily', ${schedule}, ${cmd})`;
      }
      const job = await db.queryObject(
        `select jobid, jobname, schedule, active from cron.job where jobname='analytics_digest_daily'`,
      );
      const runs = await db.queryObject(
        `select status, return_message, start_time from cron.job_run_details
         where jobid in (select jobid from cron.job where jobname='analytics_digest_daily')
         order by start_time desc limit 3`,
      );
      return json({ ok: true, mode, job: job.rows, recentRuns: runs.rows });
    } catch (e) {
      return json({ ok: false, mode, error: String((e as Error)?.message ?? e) }, 500);
    } finally {
      await db.end();
    }
  }

  // ── digest ────────────────────────────────────────────────────────────────
  const tz = env("OWNER_TZ") || "Europe/London";
  const w = windows(tz);
  const dateLabel = new Date(w.y0).toLocaleDateString("en-GB", {
    timeZone: tz, weekday: "long", day: "numeric", month: "long",
  });

  // Postgres (authoritative) — parallel, each null-safe
  const P = (table: string, col: string, a: number, b: number) =>
    pgCount(table, [`${col}=gte.${iso(a)}`, `${col}=lt.${iso(b)}`]).catch(() => null);
  const [
    totalUsers,
    signupsY, signupsP,
    workoutsY, workoutsP,
    mealsY, mealsP,
    errorsY, errorsP,
  ] = await Promise.all([
    pgCount("profiles").catch(() => null),
    P("profiles", "created_at", w.y0, w.y1), P("profiles", "created_at", w.p0, w.p1),
    P("activity_logs", "created_at", w.y0, w.y1), P("activity_logs", "created_at", w.p0, w.p1),
    P("meal_logs", "logged_at", w.y0, w.y1), P("meal_logs", "logged_at", w.p0, w.p1),
    P("error_logs", "created_at", w.y0, w.y1), P("error_logs", "created_at", w.p0, w.p1),
  ]);

  // PostHog engagement (DAU deduped by person + AI plans), yesterday vs prior
  let dauY: number | null = null, dauP: number | null = null, plansY: number | null = null, plansP: number | null = null;
  try {
    const r = (await hogql(`
      select
        count(distinct if(timestamp>=toDateTime(${sec(w.y0)}) and timestamp<toDateTime(${sec(w.y1)}), person_id, null)) as dau_y,
        count(distinct if(timestamp>=toDateTime(${sec(w.p0)}) and timestamp<toDateTime(${sec(w.p1)}), person_id, null)) as dau_p,
        countIf(event='plan_generated' and timestamp>=toDateTime(${sec(w.y0)}) and timestamp<toDateTime(${sec(w.y1)})) as plans_y,
        countIf(event='plan_generated' and timestamp>=toDateTime(${sec(w.p0)}) and timestamp<toDateTime(${sec(w.p1)})) as plans_p
      from events
      where timestamp>=toDateTime(${sec(w.p0)}) and timestamp<toDateTime(${sec(w.y1)})`))[0] as number[];
    [dauY, dauP, plansY, plansP] = [r[0], r[1], r[2], r[3]];
  } catch (_) { /* section degrades gracefully */ }

  // Sentry stability
  let issues: { title: string; count: string; url: string }[] = [];
  let sentryErr = false;
  try { issues = await sentryTopIssues(); } catch (_) { sentryErr = true; }

  const issuesHtml = sentryErr
    ? `<p style="color:#777">Sentry unavailable.</p>`
    : issues.length === 0
      ? `<p style="color:#16a34a">No unresolved issues in the last 24h. ✅</p>`
      : `<table style="width:100%;border-collapse:collapse">${issues
          .map(
            (i) =>
              `<tr><td style="padding:6px 0;color:#ddd;border-bottom:1px solid #222">${i.title}</td>
               <td style="padding:6px 0;text-align:right;color:#f97316;font-weight:700;border-bottom:1px solid #222">${i.count}</td></tr>`,
          )
          .join("")}</table>`;

  const html = `
  <div style="background:#0a0a0a;padding:24px;font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#eee">
    <div style="max-width:640px;margin:0 auto">
      <div style="font-size:13px;color:#f97316;letter-spacing:.08em;text-transform:uppercase;font-weight:700">HIIT · Daily Report</div>
      <h1 style="font-size:22px;color:#fff;margin:4px 0 2px">${dateLabel}</h1>
      <div style="font-size:12px;color:#777;margin-bottom:20px">Totals for the day, vs. the day before.</div>

      <div style="font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:#999;font-weight:700;margin:18px 0 8px">Growth</div>
      <table style="border-collapse:separate;border-spacing:8px 0;width:100%"><tr>
        ${tile("New signups", signupsY, signupsP)}
        ${tile("Total users", totalUsers, totalUsers)}
      </tr></table>

      <div style="font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:#999;font-weight:700;margin:18px 0 8px">Engagement</div>
      <table style="border-collapse:separate;border-spacing:8px 0;width:100%"><tr>
        ${tile("Active users", dauY, dauP)}
        ${tile("Workouts", workoutsY, workoutsP)}
      </tr><tr style="height:8px"></tr><tr>
        ${tile("Meals logged", mealsY, mealsP)}
        ${tile("AI plans", plansY, plansP)}
      </tr></table>

      <div style="font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:#999;font-weight:700;margin:18px 0 8px">Stability</div>
      <table style="border-collapse:separate;border-spacing:8px 0;width:100%"><tr>
        ${tile("Errors (our log)", errorsY, errorsP)}
        <td style="padding:10px 14px;background:#111;border:1px solid #222;border-radius:10px;vertical-align:top">
          <div style="font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:#f97316;font-weight:700">Top Sentry issues (24h)</div>
          <div style="margin-top:6px">${issuesHtml}</div>
        </td>
      </tr></table>

      <div style="font-size:11px;color:#555;margin-top:24px">
        Sources: Postgres (signups, users, workouts, meals, errors) · PostHog (active users, AI plans) · Sentry (issues).
        Sent from the analytics-digest edge function.
      </div>
    </div>
  </div>`;

  if (url.searchParams.get("dry")) {
    return json({
      ok: true, dry: true, dateLabel, window: { from: iso(w.y0), to: iso(w.y1) },
      metrics: {
        totalUsers, signupsY, signupsP, workoutsY, workoutsP, mealsY, mealsP,
        errorsY, errorsP, dauY, dauP, plansY, plansP,
        sentryTopIssues: issues.length, sentryErr,
      },
      htmlBytes: html.length,
    });
  }

  const to = url.searchParams.get("to") || env("OWNER_EMAIL");
  try {
    await sendMail(to, `HIIT daily report — ${dateLabel}`, html);
    return json({ ok: true, to, window: { from: iso(w.y0), to: iso(w.y1) } });
  } catch (e) {
    return json({ ok: false, error: String((e as Error)?.message ?? e) }, 500);
  }
});
