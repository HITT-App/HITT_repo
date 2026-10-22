// notify-report — emails the owner when a user reports content (App Store Guideline 1.2).
// Best-effort: the client invokes this fire-and-forget right after inserting a
// content_reports row, so the owner can action reports within 24 hours. The
// authoritative moderation surface is Admin → Moderation in the app; email is a nudge.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const env = (k: string) => Deno.env.get(k) ?? "";
const OWNER_EMAIL = "casey@hiituk.com";
const MAX_EMAILS_PER_HOUR = 20;
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });
const esc = (s: unknown) =>
  String(s ?? "").replace(/[<>&]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" }[c]!));

async function sendMail(subject: string, html: string) {
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
    await client.send({ from: env("DIGEST_FROM_EMAIL"), to: OWNER_EMAIL, subject, html, content: "auto" });
  } finally {
    await client.close();
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const supabase = createClient(env("SUPABASE_URL"), env("SUPABASE_ANON_KEY"), {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    const user = userData?.user;
    if (!user) return json({ error: "Unauthorized" }, 401);

    const { contentType, contentId, reason } = await req.json().catch(() => ({}));
    if (!contentType || !contentId) return json({ error: "missing fields" }, 400);

    // Only email for a report this user actually filed, and cap the volume per user.
    // RLS lets a reporter read their own content_reports rows.
    const { count: filed } = await supabase
      .from("content_reports")
      .select("id", { count: "exact", head: true })
      .eq("reporter_id", user.id)
      .eq("content_id", contentId);
    const { count: recent } = await supabase
      .from("content_reports")
      .select("id", { count: "exact", head: true })
      .eq("reporter_id", user.id)
      .gte("created_at", new Date(Date.now() - 3600_000).toISOString());
    if (!filed || (recent ?? 0) > MAX_EMAILS_PER_HOUR) return json({ ok: true });

    const subject = `HIIT — new ${esc(contentType)} report`;
    const html =
      `<p>A user reported <b>${esc(contentType)}</b> content in the HIIT community.</p>` +
      `<p>Reason: <b>${esc(reason)}</b><br/>Content ID: <code>${esc(contentId)}</code></p>` +
      `<p>Open <b>Admin → Moderation</b> in the app to review and action it (within 24 hours).</p>`;
    await sendMail(subject, html).catch((e) => console.error("sendMail failed:", e));
    return json({ ok: true });
  } catch (e) {
    console.error("notify-report error:", e);
    // Never surface an error to the reporter's client — reporting already succeeded.
    return new Response(JSON.stringify({ ok: false }), {
      status: 200,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
