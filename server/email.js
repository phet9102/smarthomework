/**
 * Transactional email (sign-up confirmation). Two providers, picked automatically:
 *
 * 1) Gmail API — send from a dedicated Gmail "bot" account, no domain needed.
 *      GMAIL_USER           smarthomeworkmail@gmail.com
 *      GMAIL_CLIENT_ID      OAuth client ID (Google Cloud → Credentials)
 *      GMAIL_CLIENT_SECRET  OAuth client secret (Secret)
 *      GMAIL_REFRESH_TOKEN  refresh token for GMAIL_USER with scope gmail.send (Secret)
 *      EMAIL_FROM_NAME      display name, default "Smart Homework"
 *
 * 2) Resend — when you own a domain.
 *      RESEND_API_KEY, EMAIL_FROM ("Smart Homework <no-reply@yourdomain>")
 *
 * Gmail is used when its variables are present; otherwise Resend.
 */

export function emailProvider(env) {
  if (env.GMAIL_USER && env.GMAIL_CLIENT_ID && env.GMAIL_CLIENT_SECRET && env.GMAIL_REFRESH_TOKEN) return 'gmail';
  if (env.RESEND_API_KEY && env.EMAIL_FROM) return 'resend';
  return null;
}

export function emailConfigured(env) {
  return emailProvider(env) !== null;
}

export async function sendEmail(env, message) {
  const provider = emailProvider(env);
  if (provider === 'gmail') return sendViaGmail(env, message);
  if (provider === 'resend') return sendViaResend(env, message);
  return false;
}

// ---------- Resend ----------

async function sendViaResend(env, { to, subject, html, text }) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { authorization: `Bearer ${env.RESEND_API_KEY}`, 'content-type': 'application/json' },
    body: JSON.stringify({ from: env.EMAIL_FROM, to: [to], subject, html, text }),
  });
  if (!res.ok) {
    console.error('Resend error', res.status, await res.text().catch(() => ''));
    return false;
  }
  return true;
}

// ---------- Gmail API ----------

// Access tokens last ~1 hour; reuse one while this worker instance is warm.
let cachedToken = null; // { token, expiresAt, key }

async function gmailAccessToken(env) {
  const key = env.GMAIL_REFRESH_TOKEN.slice(-12);
  if (cachedToken && cachedToken.key === key && cachedToken.expiresAt > Date.now() + 60_000) return cachedToken.token;
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: env.GMAIL_CLIENT_ID,
      client_secret: env.GMAIL_CLIENT_SECRET,
      refresh_token: env.GMAIL_REFRESH_TOKEN,
      grant_type: 'refresh_token',
    }).toString(),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.access_token) {
    // "invalid_grant" usually means the refresh token expired (app left in "Testing") or was revoked.
    console.error('Gmail token error', res.status, data.error, data.error_description);
    return null;
  }
  cachedToken = { token: data.access_token, expiresAt: Date.now() + (data.expires_in || 3600) * 1000, key };
  return data.access_token;
}

const utf8 = new TextEncoder();

function base64(bytes) {
  let bin = '';
  for (let i = 0; i < bytes.length; i += 1) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

const b64Utf8 = (s) => base64(utf8.encode(s));
const base64Url = (s) => b64Utf8(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
/** RFC 2047 encoded-word so Thai text works in Subject / From name. */
const encodeHeader = (s) => `=?UTF-8?B?${b64Utf8(s)}?=`;
const wrap76 = (s) => s.replace(/.{1,76}/g, '$&\r\n').trimEnd();

/** Builds a multipart/alternative (text + HTML) MIME message, UTF-8 throughout. */
export function buildMime({ fromName, fromEmail, to, subject, html, text }) {
  const boundary = `shp_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
  return [
    `From: ${encodeHeader(fromName)} <${fromEmail}>`,
    `To: <${to}>`,
    `Subject: ${encodeHeader(subject)}`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    '',
    `--${boundary}`,
    'Content-Type: text/plain; charset="UTF-8"',
    'Content-Transfer-Encoding: base64',
    '',
    wrap76(b64Utf8(text)),
    `--${boundary}`,
    'Content-Type: text/html; charset="UTF-8"',
    'Content-Transfer-Encoding: base64',
    '',
    wrap76(b64Utf8(html)),
    `--${boundary}--`,
    '',
  ].join('\r\n');
}

async function sendViaGmail(env, { to, subject, html, text }) {
  const token = await gmailAccessToken(env);
  if (!token) return false;
  const raw = base64Url(
    buildMime({ fromName: env.EMAIL_FROM_NAME || 'Smart Homework', fromEmail: env.GMAIL_USER, to, subject, html, text }),
  );
  const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify({ raw }),
  });
  if (!res.ok) {
    console.error('Gmail send error', res.status, await res.text().catch(() => ''));
    if (res.status === 401) cachedToken = null;
    return false;
  }
  return true;
}

// ---------- message content ----------

const escapeHtml = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

const COPY = {
  th: {
    subject: 'ยืนยันอีเมลของคุณ · Smart Homework',
    hello: (name) => `สวัสดี ${name}`,
    body: 'กดปุ่มด้านล่างเพื่อยืนยันอีเมลและเริ่มใช้งาน Smart Homework',
    button: 'ยืนยันอีเมล',
    expires: (h) => `ลิงก์นี้ใช้ได้ ${h} ชั่วโมงและใช้ได้ครั้งเดียว`,
    ignore: 'ถ้าคุณไม่ได้สมัคร ไม่ต้องทำอะไร บัญชีจะไม่ถูกเปิดใช้งาน',
    fallback: 'ถ้ากดปุ่มไม่ได้ ให้คัดลอกลิงก์นี้ไปเปิดในเบราว์เซอร์:',
    bot: 'อีเมลนี้ส่งอัตโนมัติ กรุณาอย่าตอบกลับ',
  },
  en: {
    subject: 'Confirm your email · Smart Homework',
    hello: (name) => `Hi ${name}`,
    body: 'Tap the button below to confirm your email and start using Smart Homework.',
    button: 'Confirm email',
    expires: (h) => `This link works once and expires in ${h} hours.`,
    ignore: "If you didn't sign up, just ignore this email; the account will not be activated.",
    fallback: "If the button doesn't work, copy this link into your browser:",
    bot: 'This is an automated message. Please do not reply.',
  },
};

export function verificationEmail({ lang, name, link, hours }) {
  const c = COPY[lang] || COPY.th;
  const safeName = escapeHtml(name || '');
  const safeLink = escapeHtml(link);
  const html = `<!doctype html><html><body style="margin:0;background:#f1f5f9;font-family:'IBM Plex Sans Thai',Tahoma,Arial,sans-serif;color:#0f172a">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:24px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border-radius:16px;overflow:hidden">
<tr><td style="background:#4f46e5;padding:20px 24px;color:#ffffff;font-size:18px;font-weight:bold">Smart Homework</td></tr>
<tr><td style="padding:24px">
<p style="margin:0 0 12px;font-size:16px;font-weight:bold">${c.hello(safeName)}</p>
<p style="margin:0 0 20px;font-size:15px;line-height:1.6">${c.body}</p>
<p style="margin:0 0 20px"><a href="${safeLink}" style="display:inline-block;background:#4f46e5;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:12px;font-weight:bold">${c.button}</a></p>
<p style="margin:0 0 8px;font-size:13px;color:#64748b">${c.expires(hours)}</p>
<p style="margin:0 0 16px;font-size:13px;color:#64748b">${c.ignore}</p>
<p style="margin:0 0 16px;font-size:12px;color:#94a3b8">${c.fallback}<br><a href="${safeLink}" style="color:#4f46e5;word-break:break-all">${safeLink}</a></p>
<p style="margin:0;font-size:11px;color:#cbd5e1">${c.bot}</p>
</td></tr></table></td></tr></table></body></html>`;
  const text = `${c.hello(name || '')}\n\n${c.body}\n\n${link}\n\n${c.expires(hours)}\n${c.ignore}\n\n${c.bot}`;
  return { subject: c.subject, html, text };
}
