// Analytics digest — runs on GitHub Actions (Spacemail SMTP works from CI runners).
// mode=smoketest → send one test email (proves SMTP). mode=digest → full report (WIP).
import nodemailer from "nodemailer";

const env = (k, d = "") => process.env[k] ?? d;
const MODE = env("MODE", "digest");

function transport() {
  const port = Number(env("SMTP_PORT", "465"));
  return nodemailer.createTransport({
    host: env("SMTP_HOST"),
    port,
    secure: port === 465, // implicit TLS on 465; STARTTLS on 587
    auth: { user: env("SMTP_USER"), pass: env("SMTP_PASSWORD") },
  });
}

async function send(to, subject, html) {
  const info = await transport().sendMail({ from: env("DIGEST_FROM_EMAIL"), to, subject, html });
  console.log(`sent ${info.messageId} → ${to}`);
}

async function smoketest() {
  const to = env("TO_OVERRIDE") || env("DIGEST_FROM_EMAIL");
  await send(
    to,
    "HIIT analytics — SMTP smoke test (GitHub Actions)",
    `<p>SMTP smoke test from the scheduled GitHub Action.</p>
     <p>If you're reading this, Spacemail SMTP works from GitHub Actions runners. ✅</p>`,
  );
}

if (MODE === "smoketest") {
  await smoketest();
} else {
  console.log("digest mode not implemented yet — exiting cleanly");
  process.exit(0);
}
