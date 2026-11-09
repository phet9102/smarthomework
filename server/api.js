/**
 * Smart Homework API: accounts, free trial, PromptPay payments, admin review, cloud sync.
 * Runs on Cloudflare Pages Functions (see functions/api/[[path]].js) with a D1 database
 * bound as `DB`. Configuration comes from environment variables set in the dashboard:
 *
 *   PROMPTPAY_ID    PromptPay ID that receives money (phone linked to K PLUS, or national ID)
 *   PROMPTPAY_NAME  Name shown to payers, e.g. "วิชัย ก." (optional)
 *   ADMIN_EMAILS    Comma-separated emails allowed to approve payments
 *   PRICE_THB       Monthly price, default 49
 *   TRIAL_DAYS      Free-trial length for new accounts, default 14
 *   PAY_QR_MINUTES  How long a payment QR stays valid, default 10
 *   GMAIL_USER, GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REFRESH_TOKEN
 *                   Send confirmation emails from a Gmail bot account (see server/email.js)
 *   RESEND_API_KEY  …or Resend, once you own a domain (Secret)
 *   EMAIL_FROM      Sender, e.g. "Smart Homework <no-reply@kanokchan.dev>"
 *   APP_URL         Optional site URL for links in emails, e.g. https://smarthomework.pages.dev
 *   REQUIRE_EMAIL_VERIFICATION  'false' to skip the email step even when Resend is set up.
 *                   Without RESEND_API_KEY + EMAIL_FROM, verification is skipped automatically
 *                   (sign-up logs in right away), so the site works before you own a domain.
 *
 * Personal PromptPay accounts have no API that reports incoming money, so every
 * checkout gets a unique amount (price + 1–99 satang). The admin matches that exact
 * amount against the K PLUS incoming-transfer notification and approves it.
 */
import { promptPayPayload, isValidPromptPayId, maskPromptPayId } from './promptpay.js';
import { emailConfigured, emailProvider, sendEmail, verificationEmail } from './email.js';
import { hashPassword, randomHex, randomId, randomToken, sha256Hex, verifyPassword } from './security.js';

const MS_DAY = 24 * 60 * 60 * 1000;
const SESSION_DAYS = 30;
const COOKIE = 'shp_session';
// A QR is valid for PAY_QR_MINUTES (default 10). After that the payer still has a grace
// period to tap "I've paid" (they may have transferred at the last second), and the
// unique satang amount stays reserved even longer so a late transfer is never confused
// with someone else's new checkout.
const NOTIFY_GRACE_MS = 30 * 60 * 1000;
const AMOUNT_HOLD_MS = 2 * 60 * 60 * 1000;
const TRIAL_LINK_MS = MS_DAY; // a /trial/<token> link is valid for 24 hours (room to confirm the email first)
const VERIFY_TTL_MS = MS_DAY; // a /verify/<token> email link is valid for 24 hours
const TOKEN_RE = /^[A-Za-z0-9_-]{20,64}$/;
const PERIOD_DAYS = 30; // one "month" of Pro
const MAX_BODY_BYTES = 600 * 1024;
const MAX_SYNC_BYTES = 512 * 1024;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

class HttpError extends Error {
  constructor(status, code) {
    super(code);
    this.status = status;
    this.code = code;
  }
}

function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      ...headers,
    },
  });
}

function getConfig(env) {
  const price = Number(env.PRICE_THB);
  const trial = Number(env.TRIAL_DAYS);
  const qrMinutes = Number(env.PAY_QR_MINUTES);
  return {
    payWindowMs: (Number.isFinite(qrMinutes) && qrMinutes >= 3 && qrMinutes <= 1440 ? Math.round(qrMinutes) : 10) * 60 * 1000,
    priceThb: Number.isFinite(price) && price > 0 ? Math.round(price) : 49,
    trialDays: Number.isFinite(trial) && trial >= 0 ? Math.round(trial) : 14,
    promptpayId: env.PROMPTPAY_ID || '',
    promptpayName: env.PROMPTPAY_NAME || '',
    admins: String(env.ADMIN_EMAILS || '')
      .split(',')
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean),
  };
}

/** Email confirmation is on only when sending is set up and not switched off. */
function verificationRequired(env) {
  return emailConfigured(env) && String(env.REQUIRE_EMAIL_VERIFICATION || '').toLowerCase() !== 'false';
}

function billingConfigured(cfg) {
  return isValidPromptPayId(cfg.promptpayId);
}

/**
 * Current plan for a user.
 * status: 'active' (paid) | 'trial' | 'free' (never trialed or paid) | 'expired'
 */
export function planOf(user, now = Date.now()) {
  const paidUntil = user.paid_until || 0;
  const trialEnds = user.trial_ends_at || 0;
  const trialAvailable = !user.trial_ends_at;
  let status = trialAvailable && !paidUntil ? 'free' : 'expired';
  let endsAt = Math.max(paidUntil, trialEnds) || null;
  if (paidUntil > now) {
    status = 'active';
    endsAt = paidUntil;
  } else if (trialEnds > now) {
    status = 'trial';
    endsAt = trialEnds;
  }
  const daysLeft = endsAt && endsAt > now ? Math.ceil((endsAt - now) / MS_DAY) : 0;
  return { status, endsAt, daysLeft, trialAvailable, trialEndsAt: trialEnds || null, paidUntil: paidUntil || null };
}

const isPro = (user, now) => ['active', 'trial'].includes(planOf(user, now).status);

function publicUser(user, cfg) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    lang: user.lang,
    isAdmin: cfg.admins.includes(user.email),
    createdAt: user.created_at,
  };
}

/** Short human reference shown on the QR page and to the admin, e.g. "7F3K9Q". */
function paymentRef(id) {
  return id.replace(/[^A-Za-z0-9]/g, '').slice(-6).toUpperCase();
}

function paymentView(p, cfg) {
  const open = p.status === 'awaiting' || p.status === 'submitted' || p.status === 'expired';
  return {
    id: p.id,
    ref: paymentRef(p.id),
    amount: p.amount_satang / 100,
    months: p.months,
    status: p.status,
    note: p.note || '',
    createdAt: p.created_at,
    expiresAt: p.expires_at,
    notifyUntil: p.expires_at + NOTIFY_GRACE_MS,
    submittedAt: p.submitted_at,
    reviewedAt: p.reviewed_at,
    payload: open && billingConfigured(cfg) ? promptPayPayload(cfg.promptpayId, p.amount_satang / 100) : null,
    receiverName: cfg.promptpayName,
    receiverMasked: maskPromptPayId(cfg.promptpayId),
  };
}

// ---------- request helpers ----------

async function readJson(request) {
  const text = await request.text();
  if (text.length > MAX_BODY_BYTES) throw new HttpError(413, 'payload_too_large');
  if (!text) return {};
  try {
    const data = JSON.parse(text);
    return data && typeof data === 'object' ? data : {};
  } catch {
    throw new HttpError(400, 'bad_request');
  }
}

function getCookie(request, name) {
  const header = request.headers.get('cookie') || '';
  for (const part of header.split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k === name) return decodeURIComponent(v.join('='));
  }
  return null;
}

function sessionCookie(token, maxAgeSeconds) {
  return `${COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAgeSeconds}`;
}

function clientIp(request) {
  return request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for') || 'unknown';
}

async function currentUser(request, env) {
  const token = getCookie(request, COOKIE);
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return null;
  const tokenHash = await sha256Hex(token);
  return env.DB.prepare(
    `SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id
     WHERE s.token_hash = ? AND s.expires_at > ? AND u.email_verified_at IS NOT NULL`,
  )
    .bind(tokenHash, Date.now())
    .first();
}

async function requireUser(request, env) {
  const user = await currentUser(request, env);
  if (!user) throw new HttpError(401, 'unauthorized');
  return user;
}

async function requireAdmin(request, env, cfg) {
  const user = await requireUser(request, env);
  if (!cfg.admins.includes(user.email)) throw new HttpError(403, 'forbidden');
  return user;
}

async function createSession(env, userId) {
  const token = randomHex(32);
  const now = Date.now();
  await env.DB.prepare('INSERT INTO sessions (token_hash, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)')
    .bind(await sha256Hex(token), userId, now + SESSION_DAYS * MS_DAY, now)
    .run();
  // Opportunistic cleanup of expired sessions.
  await env.DB.prepare('DELETE FROM sessions WHERE expires_at < ?').bind(now).run();
  return sessionCookie(token, SESSION_DAYS * 24 * 60 * 60);
}

/** Simple fixed-window rate limit stored in D1. */
async function rateLimit(env, key, limit, windowMs) {
  const now = Date.now();
  const row = await env.DB.prepare('SELECT count, window_start FROM rate_limits WHERE key = ?').bind(key).first();
  if (row && now - row.window_start < windowMs) {
    if (row.count >= limit) throw new HttpError(429, 'too_many_attempts');
    await env.DB.prepare('UPDATE rate_limits SET count = count + 1 WHERE key = ?').bind(key).run();
  } else {
    await env.DB.prepare(
      'INSERT INTO rate_limits (key, count, window_start) VALUES (?, 1, ?) ON CONFLICT(key) DO UPDATE SET count = 1, window_start = excluded.window_start',
    )
      .bind(key, now)
      .run();
  }
}

async function openPaymentFor(env, userId) {
  return env.DB.prepare(
    `SELECT * FROM payments WHERE user_id = ?
       AND (status = 'submitted' OR (status = 'awaiting' AND expires_at > ?))
     ORDER BY created_at DESC LIMIT 1`,
  )
    .bind(userId, Date.now())
    .first();
}

async function meBody(env, user, cfg) {
  const open = await openPaymentFor(env, user.id);
  return {
    user: publicUser(user, cfg),
    plan: planOf(user),
    pricing: { priceThb: cfg.priceThb, trialDays: cfg.trialDays, configured: billingConfigured(cfg) },
    openPayment: open ? paymentView(open, cfg) : null,
  };
}

// ---------- handlers ----------

/** Only same-site paths we know are allowed as a post-verification redirect. */
function safeNext(value) {
  const v = String(value || '');
  return /^\/(subscription|trial\/[\w-]+|pay\/[\w-]+|receipt\/[\w-]+)?$/.test(v) ? v || '/' : '/';
}

function appOrigin(request, env) {
  return (env.APP_URL || new URL(request.url).origin).replace(/\/+$/, '');
}

/** Creates a one-time /verify/<token> link and emails it. */
async function sendVerification(request, env, user, next) {
  const token = randomToken();
  const now = Date.now();
  await env.DB.prepare(
    "INSERT INTO email_tokens (token_hash, user_id, purpose, next_path, created_at, expires_at) VALUES (?, ?, 'verify', ?, ?, ?)",
  )
    .bind(await sha256Hex(token), user.id, safeNext(next), now, now + VERIFY_TTL_MS)
    .run();
  const link = `${appOrigin(request, env)}/verify/${token}`;
  const message = verificationEmail({ lang: user.lang, name: user.name, link, hours: VERIFY_TTL_MS / 3600000 });
  const sent = await sendEmail(env, { to: user.email, ...message });
  if (!sent) throw new HttpError(502, 'email_send_failed');
}

async function register(request, env, cfg) {
  const body = await readJson(request);
  const email = String(body.email || '').trim().toLowerCase();
  const password = String(body.password || '');
  if (!EMAIL_RE.test(email) || email.length > 200) throw new HttpError(400, 'invalid_email');
  if (password.length < 8 || password.length > 200) throw new HttpError(400, 'weak_password');
  const mustVerify = verificationRequired(env);
  await rateLimit(env, `register:${clientIp(request)}`, 10, 60 * 60 * 1000);

  const name = String(body.name || '').trim().slice(0, 40) || email.split('@')[0].slice(0, 40);
  const lang = /^[a-z]{2,3}$/.test(body.lang || '') ? body.lang : 'th';
  const { hash, salt } = await hashPassword(password);
  const existing = await env.DB.prepare('SELECT * FROM users WHERE email = ?').bind(email).first();

  let user;
  if (existing?.email_verified_at) {
    throw new HttpError(409, 'email_taken');
  } else if (existing) {
    // Nobody has proven they own this email yet, so the newest sign-up wins.
    await env.DB.prepare('UPDATE users SET name = ?, pass_hash = ?, pass_salt = ?, lang = ? WHERE id = ?')
      .bind(name, hash, salt, lang, existing.id)
      .run();
    user = { ...existing, name, lang };
  } else {
    const id = randomId('u_');
    await env.DB.prepare(
      `INSERT INTO users (id, email, name, pass_hash, pass_salt, lang, trial_ends_at, paid_until, email_verified_at, created_at)
       VALUES (?, ?, ?, ?, ?, ?, NULL, NULL, NULL, ?)`,
    )
      .bind(id, email, name, hash, salt, lang, Date.now())
      .run();
    user = { id, email, name, lang };
  }

  if (!mustVerify) {
    // No email step: confirm immediately and log in.
    await env.DB.prepare('UPDATE users SET email_verified_at = ? WHERE id = ?').bind(Date.now(), user.id).run();
    const fresh = await env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(user.id).first();
    const cookie = await createSession(env, user.id);
    return json({ ...(await meBody(env, fresh, cfg)), next: safeNext(body.next) }, 201, { 'set-cookie': cookie });
  }

  await sendVerification(request, env, user, body.next);
  return json({ pendingVerification: true, email }, 202);
}

async function resendVerification(request, env) {
  const body = await readJson(request);
  const email = String(body.email || '').trim().toLowerCase();
  if (!EMAIL_RE.test(email)) throw new HttpError(400, 'invalid_email');
  if (!verificationRequired(env)) throw new HttpError(503, 'email_not_configured');
  await rateLimit(env, `resend-ip:${clientIp(request)}`, 10, 60 * 60 * 1000);
  await rateLimit(env, `resend:${email}`, 3, 60 * 60 * 1000);
  const user = await env.DB.prepare('SELECT * FROM users WHERE email = ?').bind(email).first();
  // Same answer whether or not the account exists, so emails cannot be probed.
  if (user && !user.email_verified_at) await sendVerification(request, env, user, body.next);
  return json({ ok: true });
}

async function verifyEmail(request, env, cfg, token) {
  if (!TOKEN_RE.test(token)) throw new HttpError(404, 'link_invalid');
  const row = await env.DB.prepare("SELECT * FROM email_tokens WHERE token_hash = ? AND purpose = 'verify'")
    .bind(await sha256Hex(token))
    .first();
  if (!row) throw new HttpError(404, 'link_invalid');
  if (row.used_at) throw new HttpError(409, 'link_used');
  const now = Date.now();
  if (row.expires_at <= now) throw new HttpError(410, 'link_expired');

  const claimed = await env.DB.prepare('UPDATE email_tokens SET used_at = ? WHERE token_hash = ? AND used_at IS NULL')
    .bind(now, row.token_hash)
    .run();
  if (!claimed.meta?.changes) throw new HttpError(409, 'link_used');
  await env.DB.prepare('UPDATE users SET email_verified_at = COALESCE(email_verified_at, ?) WHERE id = ?')
    .bind(now, row.user_id)
    .run();

  const user = await env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(row.user_id).first();
  const cookie = await createSession(env, user.id);
  return json({ ...(await meBody(env, user, cfg)), next: row.next_path || '/' }, 200, { 'set-cookie': cookie });
}

async function login(request, env, cfg) {
  const body = await readJson(request);
  const email = String(body.email || '').trim().toLowerCase();
  const password = String(body.password || '');
  const limitKey = `login:${clientIp(request)}:${email}`;
  await rateLimit(env, limitKey, 10, 15 * 60 * 1000);

  const user = await env.DB.prepare('SELECT * FROM users WHERE email = ?').bind(email).first();
  // Always run the hash so response time does not reveal whether the email exists.
  const ok = user
    ? await verifyPassword(password, user.pass_salt, user.pass_hash)
    : (await hashPassword(password), false);
  if (!ok) throw new HttpError(401, 'invalid_credentials');
  if (!user.email_verified_at) {
    if (verificationRequired(env)) throw new HttpError(403, 'email_not_verified');
    await env.DB.prepare('UPDATE users SET email_verified_at = ? WHERE id = ?').bind(Date.now(), user.id).run();
  }

  await env.DB.prepare('DELETE FROM rate_limits WHERE key = ?').bind(limitKey).run();
  const cookie = await createSession(env, user.id);
  return json(await meBody(env, user, cfg), 200, { 'set-cookie': cookie });
}

async function logout(request, env) {
  const token = getCookie(request, COOKIE);
  if (token) {
    await env.DB.prepare('DELETE FROM sessions WHERE token_hash = ?').bind(await sha256Hex(token)).run();
  }
  return json({ ok: true }, 200, { 'set-cookie': sessionCookie('', 0) });
}

async function getMe(request, env, cfg) {
  const user = await requireUser(request, env);
  return json(await meBody(env, user, cfg));
}

async function updateMe(request, env, cfg) {
  const user = await requireUser(request, env);
  const body = await readJson(request);
  const name = body.name !== undefined ? String(body.name).trim().slice(0, 40) || user.name : user.name;
  const lang = /^[a-z]{2,3}$/.test(body.lang || '') ? body.lang : user.lang;
  await env.DB.prepare('UPDATE users SET name = ?, lang = ? WHERE id = ?').bind(name, lang, user.id).run();
  return json(await meBody(env, { ...user, name, lang }, cfg));
}

function billingConfig(cfg, env) {
  return json({
    emailVerification: verificationRequired(env),
    priceThb: cfg.priceThb,
    trialDays: cfg.trialDays,
    configured: billingConfigured(cfg),
    receiverName: cfg.promptpayName,
    receiverMasked: maskPromptPayId(cfg.promptpayId),
  });
}

async function checkout(request, env, cfg) {
  const user = await requireUser(request, env);
  if (!billingConfigured(cfg)) throw new HttpError(503, 'billing_not_configured');
  const body = await readJson(request);
  const months = [1, 3, 6, 12].includes(Number(body.months)) ? Number(body.months) : 1;
  const now = Date.now();

  // Expire stale checkouts so their satang values can be reused.
  await env.DB.prepare("UPDATE payments SET status = 'expired' WHERE status = 'awaiting' AND expires_at <= ?")
    .bind(now)
    .run();

  // Reuse the user's own unpaid checkout for the same period instead of piling up new ones.
  const existing = await env.DB.prepare(
    "SELECT * FROM payments WHERE user_id = ? AND status = 'awaiting' AND months = ? AND expires_at > ? ORDER BY created_at DESC LIMIT 1",
  )
    .bind(user.id, months, now)
    .first();
  if (existing) return json({ payment: paymentView(existing, cfg) });

  // Unique amount: base price + 1–99 satang not used by any other open payment.
  const base = cfg.priceThb * 100 * months;
  const { results } = await env.DB.prepare(
    `SELECT amount_satang FROM payments
     WHERE amount_satang BETWEEN ? AND ?
       AND (status IN ('awaiting', 'submitted') OR (status = 'expired' AND expires_at > ?))`,
  )
    .bind(base, base + 99, now - AMOUNT_HOLD_MS)
    .all();
  const used = new Set((results || []).map((r) => r.amount_satang - base));
  const free = [];
  for (let s = 1; s <= 99; s += 1) if (!used.has(s)) free.push(s);
  if (free.length === 0) throw new HttpError(503, 'busy');
  const satang = free[Math.floor(Math.random() * free.length)];

  const id = randomToken(); // also the secret part of /pay/<id> and /receipt/<id>
  await env.DB.prepare(
    `INSERT INTO payments (id, user_id, amount_satang, months, status, note, created_at, expires_at)
     VALUES (?, ?, ?, ?, 'awaiting', '', ?, ?)`,
  )
    .bind(id, user.id, base + satang, months, now, now + cfg.payWindowMs)
    .run();
  const payment = await env.DB.prepare('SELECT * FROM payments WHERE id = ?').bind(id).first();
  return json({ payment: paymentView(payment, cfg) }, 201);
}

async function ownPayment(env, user, id) {
  const p = await env.DB.prepare('SELECT * FROM payments WHERE id = ? AND user_id = ?').bind(id, user.id).first();
  if (!p) throw new HttpError(404, 'not_found');
  return p;
}

async function notifyPayment(request, env, cfg, id) {
  const user = await requireUser(request, env);
  const body = await readJson(request);
  const note = String(body.note || '').trim().slice(0, 200);
  const p = await ownPayment(env, user, id);
  const now = Date.now();
  const withinGrace = now < p.expires_at + NOTIFY_GRACE_MS;
  if ((p.status === 'awaiting' || p.status === 'expired') && withinGrace) {
    await env.DB.prepare("UPDATE payments SET status = 'submitted', note = ?, submitted_at = ? WHERE id = ?")
      .bind(note, now, id)
      .run();
  } else if (p.status === 'submitted') {
    await env.DB.prepare('UPDATE payments SET note = ? WHERE id = ?').bind(note, id).run();
  } else {
    throw new HttpError(409, 'invalid_state');
  }
  return json({ payment: paymentView(await ownPayment(env, user, id), cfg) });
}

async function cancelPayment(request, env, cfg, id) {
  const user = await requireUser(request, env);
  const p = await ownPayment(env, user, id);
  if (p.status !== 'awaiting') throw new HttpError(409, 'invalid_state');
  await env.DB.prepare("UPDATE payments SET status = 'cancelled' WHERE id = ?").bind(id).run();
  return json({ payment: paymentView({ ...p, status: 'cancelled' }, cfg) });
}

async function listPayments(request, env, cfg) {
  const user = await requireUser(request, env);
  const { results } = await env.DB.prepare(
    "SELECT * FROM payments WHERE user_id = ? AND status != 'cancelled' ORDER BY created_at DESC LIMIT 20",
  )
    .bind(user.id)
    .all();
  return json({ payments: (results || []).map((p) => paymentView(p, cfg)) });
}

async function adminList(request, env, cfg, url) {
  await requireAdmin(request, env, cfg);
  const scope = url.searchParams.get('status') === 'all' ? 'all' : 'open';
  const now = Date.now();
  const where =
    scope === 'open'
      ? "WHERE p.status = 'submitted' OR (p.status = 'awaiting' AND p.expires_at > ?)"
      : 'WHERE p.created_at > ?';
  const param = scope === 'open' ? now : now - 90 * MS_DAY;
  const { results } = await env.DB.prepare(
    `SELECT p.*, u.email AS user_email, u.name AS user_name, u.trial_ends_at, u.paid_until
     FROM payments p JOIN users u ON u.id = p.user_id
     ${where}
     ORDER BY CASE p.status WHEN 'submitted' THEN 0 WHEN 'awaiting' THEN 1 ELSE 2 END, p.created_at DESC
     LIMIT 200`,
  )
    .bind(param)
    .all();
  return json({
    payments: (results || []).map((p) => ({
      ...paymentView(p, cfg),
      payload: undefined,
      user: { email: p.user_email, name: p.user_name, plan: planOf(p, now) },
    })),
  });
}

async function adminReview(request, env, cfg, id, action) {
  const admin = await requireAdmin(request, env, cfg);
  const p = await env.DB.prepare('SELECT * FROM payments WHERE id = ?').bind(id).first();
  if (!p) throw new HttpError(404, 'not_found');
  const now = Date.now();

  if (action === 'reject') {
    const res = await env.DB.prepare(
      "UPDATE payments SET status = 'rejected', reviewed_at = ?, reviewed_by = ? WHERE id = ? AND status IN ('awaiting', 'submitted')",
    )
      .bind(now, admin.email, id)
      .run();
    if (!res.meta?.changes) throw new HttpError(409, 'invalid_state');
    return json({ ok: true });
  }

  // Approve: also allowed for 'expired' (someone paid after the 24h window).
  const res = await env.DB.prepare(
    "UPDATE payments SET status = 'approved', reviewed_at = ?, reviewed_by = ? WHERE id = ? AND status IN ('awaiting', 'submitted', 'expired')",
  )
    .bind(now, admin.email, id)
    .run();
  if (!res.meta?.changes) throw new HttpError(409, 'invalid_state');

  // New period starts when the current access (paid or trial) ends, so nobody loses paid/trial days.
  const user = await env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(p.user_id).first();
  const start = Math.max(now, user.paid_until || 0, user.trial_ends_at || 0);
  const paidUntil = start + p.months * PERIOD_DAYS * MS_DAY;
  await env.DB.prepare('UPDATE users SET paid_until = ? WHERE id = ?').bind(paidUntil, user.id).run();
  return json({ ok: true, paidUntil });
}

async function getSync(request, env) {
  const user = await requireUser(request, env);
  if (!isPro(user)) throw new HttpError(402, 'pro_required');
  const row = await env.DB.prepare('SELECT data, updated_at FROM sync_data WHERE user_id = ?').bind(user.id).first();
  return json(row ? { data: JSON.parse(row.data), updatedAt: row.updated_at } : { data: null, updatedAt: null });
}

async function putSync(request, env) {
  const user = await requireUser(request, env);
  if (!isPro(user)) throw new HttpError(402, 'pro_required');
  const body = await readJson(request);
  if (!body.data || !Array.isArray(body.data.tasks)) throw new HttpError(400, 'invalid_input');
  const text = JSON.stringify(body.data);
  if (text.length > MAX_SYNC_BYTES) throw new HttpError(413, 'payload_too_large');
  const now = Date.now();
  await env.DB.prepare(
    'INSERT INTO sync_data (user_id, data, updated_at) VALUES (?, ?, ?) ON CONFLICT(user_id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at',
  )
    .bind(user.id, text, now)
    .run();
  return json({ ok: true, updatedAt: now });
}

async function getPayment(request, env, cfg, id) {
  const user = await requireUser(request, env);
  const p = await ownPayment(env, user, id);
  // Lazily mark an unpaid, timed-out checkout as expired.
  if (p.status === 'awaiting' && p.expires_at <= Date.now()) {
    await env.DB.prepare("UPDATE payments SET status = 'expired' WHERE id = ? AND status = 'awaiting'").bind(id).run();
    p.status = 'expired';
  }
  return json({ payment: paymentView(p, cfg), plan: planOf(user) });
}

// ---------- free trial links: /trial/<token> ----------

async function createTrialLink(request, env, cfg) {
  await rateLimit(env, `trial-link:${clientIp(request)}`, 30, 60 * 60 * 1000);
  const user = await currentUser(request, env);
  if (user && user.trial_ends_at) throw new HttpError(409, 'trial_used');
  const token = randomToken();
  const now = Date.now();
  await env.DB.prepare('INSERT INTO trial_links (token_hash, created_at, expires_at) VALUES (?, ?, ?)')
    .bind(await sha256Hex(token), now, now + TRIAL_LINK_MS)
    .run();
  await env.DB.prepare('DELETE FROM trial_links WHERE expires_at < ? AND used_at IS NULL').bind(now - MS_DAY).run();
  return json({ token, expiresAt: now + TRIAL_LINK_MS, trialDays: cfg.trialDays }, 201);
}

async function findTrialLink(env, token) {
  if (!TOKEN_RE.test(token)) throw new HttpError(404, 'link_invalid');
  const link = await env.DB.prepare('SELECT * FROM trial_links WHERE token_hash = ?').bind(await sha256Hex(token)).first();
  if (!link) throw new HttpError(404, 'link_invalid');
  return link;
}

async function getTrialLink(request, env, cfg, token) {
  const link = await findTrialLink(env, token);
  const user = await currentUser(request, env);
  const now = Date.now();
  return json({
    status: link.used_at ? 'used' : link.expires_at <= now ? 'expired' : 'valid',
    usedByMe: Boolean(user && link.user_id === user.id),
    expiresAt: link.expires_at,
    trialDays: cfg.trialDays,
  });
}

async function confirmTrial(request, env, cfg, token) {
  const user = await requireUser(request, env);
  const link = await findTrialLink(env, token);
  const now = Date.now();
  if (link.used_at) throw new HttpError(409, link.user_id === user.id ? 'trial_used' : 'link_used');
  if (link.expires_at <= now) throw new HttpError(410, 'link_expired');
  if (user.trial_ends_at) throw new HttpError(409, 'trial_used');

  const claimed = await env.DB.prepare('UPDATE trial_links SET used_at = ?, user_id = ? WHERE token_hash = ? AND used_at IS NULL')
    .bind(now, user.id, link.token_hash)
    .run();
  if (!claimed.meta?.changes) throw new HttpError(409, 'link_used');
  const trialEnds = now + cfg.trialDays * MS_DAY;
  await env.DB.prepare('UPDATE users SET trial_ends_at = ? WHERE id = ? AND trial_ends_at IS NULL').bind(trialEnds, user.id).run();
  return json(await meBody(env, { ...user, trial_ends_at: trialEnds }, cfg));
}

/** Checks that every table/column this version needs exists. Returns 'ok' or what is missing. */
async function checkSchema(env) {
  const needs = {
    users: ['email', 'trial_ends_at', 'paid_until', 'email_verified_at'],
    sessions: ['token_hash'],
    email_tokens: ['token_hash', 'next_path'],
    trial_links: ['token_hash'],
    payments: ['amount_satang', 'expires_at'],
    sync_data: ['user_id'],
    rate_limits: ['key'],
  };
  const missing = [];
  for (const [table, cols] of Object.entries(needs)) {
    try {
      const { results } = await env.DB.prepare(`PRAGMA table_info(${table})`).all();
      const have = new Set((results || []).map((r) => r.name));
      if (have.size === 0) missing.push(table);
      else for (const c of cols) if (!have.has(c)) missing.push(`${table}.${c}`);
    } catch {
      missing.push(table);
    }
  }
  return missing.length ? `missing: ${missing.join(', ')}` : 'ok';
}

// ---------- router ----------

export async function handleApi(request, env) {
  const url = new URL(request.url);
  const path = url.pathname.replace(/^\/api/, '').replace(/\/+$/, '') || '/';
  const method = request.method.toUpperCase();
  const cfg = getConfig(env);

  try {
    if (method === 'GET' && path === '/health') {
      return json({
        ok: true,
        db: Boolean(env.DB),
        schema: env.DB ? await checkSchema(env) : 'no_db',
        billing: billingConfigured(cfg),
        email: emailConfigured(env),
        emailProvider: emailProvider(env),
        emailVerification: verificationRequired(env),
      });
    }
    if (method === 'GET' && path === '/billing/config') return billingConfig(cfg, env);

    if (!env.DB) throw new HttpError(503, 'db_not_configured');

    // CSRF protection: state-changing requests must be same-origin JSON.
    if (method !== 'GET' && method !== 'HEAD') {
      const origin = request.headers.get('origin');
      if (origin && new URL(origin).host !== url.host) throw new HttpError(403, 'forbidden');
      if (!(request.headers.get('content-type') || '').includes('application/json')) {
        throw new HttpError(415, 'bad_request');
      }
    }

    const routes = [
      ['POST', /^\/auth\/register$/, () => register(request, env, cfg)],
      ['POST', /^\/auth\/login$/, () => login(request, env, cfg)],
      ['POST', /^\/auth\/logout$/, () => logout(request, env)],
      ['POST', /^\/auth\/resend-verification$/, () => resendVerification(request, env)],
      ['POST', /^\/auth\/verify\/([\w-]+)$/, (m) => verifyEmail(request, env, cfg, m[1])],
      ['GET', /^\/me$/, () => getMe(request, env, cfg)],
      ['PATCH', /^\/me$/, () => updateMe(request, env, cfg)],
      ['POST', /^\/billing\/checkout$/, () => checkout(request, env, cfg)],
      ['GET', /^\/billing\/payments$/, () => listPayments(request, env, cfg)],
      ['GET', /^\/billing\/payments\/([\w-]+)$/, (m) => getPayment(request, env, cfg, m[1])],
      ['POST', /^\/trial\/links$/, () => createTrialLink(request, env, cfg)],
      ['GET', /^\/trial\/links\/([\w-]+)$/, (m) => getTrialLink(request, env, cfg, m[1])],
      ['POST', /^\/trial\/links\/([\w-]+)\/confirm$/, (m) => confirmTrial(request, env, cfg, m[1])],
      ['POST', /^\/billing\/payments\/([\w-]+)\/notify$/, (m) => notifyPayment(request, env, cfg, m[1])],
      ['POST', /^\/billing\/payments\/([\w-]+)\/cancel$/, (m) => cancelPayment(request, env, cfg, m[1])],
      ['GET', /^\/admin\/payments$/, () => adminList(request, env, cfg, url)],
      ['POST', /^\/admin\/payments\/([\w-]+)\/(approve|reject)$/, (m) => adminReview(request, env, cfg, m[1], m[2])],
      ['GET', /^\/sync$/, () => getSync(request, env)],
      ['PUT', /^\/sync$/, () => putSync(request, env)],
    ];

    for (const [m, re, handler] of routes) {
      if (m !== method) continue;
      const match = path.match(re);
      if (match) return await handler(match);
    }
    throw new HttpError(404, 'not_found');
  } catch (err) {
    if (err instanceof HttpError) return json({ error: err.code }, err.status);
    console.error('API error', err?.message || err);
    // A missing table/column means the D1 database still has an older schema.sql.
    if (/no such (table|column)|has no column/i.test(String(err?.message || ''))) {
      return json({ error: 'db_schema_outdated', detail: String(err.message).slice(0, 200) }, 500);
    }
    return json({ error: 'generic' }, 500);
  }
}
