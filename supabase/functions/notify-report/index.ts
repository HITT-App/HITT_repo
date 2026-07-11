// notify-report — emails the owner when a user reports content (App Store Guideline 1.2).
// Best-effort: the client invokes this fire-and-forget right after inserting a
// content_reports row, so the owner can action reports within 24 hours. The
// authoritative moderation surface is Admin → Moderation in the app; email is a nudge.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const env = (k: string) => Deno.env.get(k) ?? "";
const OWNER_EMAIL = "casey@hiituk.com";
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
    const { contentType, contentId, reason } = await req.json().catch(() => ({}));
    if (!contentType || !contentId) {
      return new Response(JSON.stringify({ error: "missing fields" }), {
        status: 400,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }
    const subject = `HIIT — new ${esc(contentType)} report`;
    const html =
      `<p>A user reported <b>${esc(contentType)}</b> content in the HIIT community.</p>` +
      `<p>Reason: <b>${esc(reason)}</b><br/>Content ID: <code>${esc(contentId)}</code></p>` +
      `<p>Open <b>Admin → Moderation</b> in the app to review and action it (within 24 hours).</p>`;
    await sendMail(subject, html).catch((e) => console.error("sendMail failed:", e));
    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("notify-report error:", e);
    // Never surface an error to the reporter's client — reporting already succeeded.
    return new Response(JSON.stringify({ ok: false }), {
      status: 200,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
