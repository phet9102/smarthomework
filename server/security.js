// Password hashing and session tokens using only the Web Crypto API
// (available in Cloudflare Workers / Pages Functions, no dependencies).

const encoder = new TextEncoder();
// Cloudflare Workers allow at most 100,000 PBKDF2 iterations.
const PBKDF2_ITERATIONS = 100_000;

export function toHex(buffer) {
  return [...new Uint8Array(buffer)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function randomHex(bytes = 32) {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return toHex(arr);
}

export function randomId(prefix = '') {
  return `${prefix}${randomHex(12)}`;
}

/**
 * URL-safe random token (base64url, no + / =), e.g. "9yag-5OA38mcaqScXB9g5ZZFaNGllYncnCt8b_l8CE".
 * 32 bytes = 256 bits of randomness → 43 characters; impossible to guess.
 */
export function randomToken(bytes = 32) {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  let bin = '';
  for (const b of arr) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export async function sha256Hex(text) {
  return toHex(await crypto.subtle.digest('SHA-256', encoder.encode(text)));
}

export async function hashPassword(password, saltHex = randomHex(16)) {
  const key = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: encoder.encode(saltHex), iterations: PBKDF2_ITERATIONS },
    key,
    256,
  );
  return { hash: toHex(bits), salt: saltHex };
}

/** Constant-time string comparison to avoid timing leaks. */
export function safeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function verifyPassword(password, saltHex, expectedHash) {
  const { hash } = await hashPassword(password, saltHex);
  return safeEqual(hash, expectedHash);
}
