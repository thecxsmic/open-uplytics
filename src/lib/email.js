import { Resend } from "resend";
import { appUrl } from "@/lib/utils";
import { BRAND_FROM } from "@/lib/brand";

function client() {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  return new Resend(key);
}

const from = process.env.RESEND_FROM || BRAND_FROM;

function wrap(title, body) {
  return `<!doctype html><html><body style="background:#000;color:#fafafa;font-family:Inter,system-ui,sans-serif;padding:32px">
  <div style="max-width:520px;margin:0 auto;border:1px solid #27272a;border-radius:12px;padding:28px">
    <div style="font-size:13px;letter-spacing:.2em;text-transform:uppercase;color:#a1a1aa">Uplitycs</div>
    <h1 style="font-size:22px;margin:16px 0 12px">${title}</h1>
    <div style="color:#d4d4d8;line-height:1.6;font-size:15px">${body}</div>
  </div></body></html>`;
}

export async function sendMail({ to, subject, html }) {
  const resend = client();
  if (!resend) {
    console.warn("[email] RESEND_API_KEY missing; skip", { to, subject });
    return { skipped: true };
  }
  const list = Array.isArray(to) ? to : [to];
  try {
    const result = await resend.emails.send({ from, to: list, subject, html });
    if (result?.error) {
      console.error("[email] resend error", result.error);
    }
    return result;
  } catch (err) {
    console.error("[email] send failed", err);
    return { skipped: true, error: String(err?.message || err) };
  }
}

export async function sendDownEmail(to, { siteName, url, statusCode, error }) {
  return sendMail({
    to,
    subject: `[Down] ${siteName} is not responding`,
    html: wrap(
      "Site is down",
      `<p><strong>${siteName}</strong> failed a health check.</p>
       <p>URL: ${url}<br/>Status: ${statusCode ?? "n/a"}<br/>${error ? `Error: ${error}` : ""}</p>`,
    ),
  });
}

export async function sendUpEmail(to, { siteName, url, downtimeMs }) {
  const mins = Math.max(1, Math.round((downtimeMs || 0) / 60000));
  return sendMail({
    to,
    subject: `[Recovered] ${siteName} is back up`,
    html: wrap(
      "Site is back up",
      `<p><strong>${siteName}</strong> is responding again.</p>
       <p>URL: ${url}<br/>Downtime: ~${mins} min</p>`,
    ),
  });
}

export async function sendPasswordResetEmail(to, { url }) {
  return sendMail({
    to,
    subject: "Reset your Uplitycs password",
    html: wrap(
      "Reset your password",
      `<p>Use this link to set a new password. It is the backup when you no longer have your authenticator app.</p>
       <p><a href="${url}" style="display:inline-block;background:#fff;color:#000;padding:10px 16px;border-radius:8px;text-decoration:none;font-weight:600">Set a new password</a></p>
       <p style="color:#71717a;font-size:13px">The link expires in 30 minutes. If you still have the authenticator app, you do not need this email. If you did not ask for it, you can ignore it.</p>`,
    ),
  });
}

