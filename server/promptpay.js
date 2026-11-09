/**
 * PromptPay QR payload (Thai QR Payment / EMVCo Merchant-Presented Mode).
 * Works with a mobile number (e.g. K PLUS registered phone), a 13-digit
 * national ID / tax ID, or a 15-digit e-wallet ID.
 * The resulting string is what gets encoded into the QR image; every Thai
 * banking app (K PLUS, SCB EASY, Krungthai NEXT, …) can scan it, and the
 * amount is locked so the payer cannot change it.
 */

function field(id, value) {
  return `${id}${String(value.length).padStart(2, '0')}${value}`;
}

/** CRC-16/CCITT-FALSE (poly 0x1021, init 0xFFFF), as required by EMVCo. */
export function crc16(text) {
  let crc = 0xffff;
  for (let i = 0; i < text.length; i += 1) {
    crc ^= text.charCodeAt(i) << 8;
    for (let b = 0; b < 8; b += 1) {
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

export function normalizePromptPayId(raw) {
  return String(raw || '').replace(/[^0-9]/g, '');
}

export function isValidPromptPayId(raw) {
  const id = normalizePromptPayId(raw);
  return id.length === 10 || id.length === 13 || id.length === 15;
}

/**
 * @param {string} target  PromptPay ID: phone "081-234-5678", national ID, or e-wallet ID
 * @param {number} [amount] amount in THB, e.g. 49.37
 */
export function promptPayPayload(target, amount) {
  const id = normalizePromptPayId(target);
  let account;
  if (id.length >= 15) account = field('03', id); // e-wallet
  else if (id.length >= 13) account = field('02', id); // national ID / tax ID
  else account = field('01', `0000000000000${id.replace(/^0/, '66')}`.slice(-13)); // phone → 0066XXXXXXXXX

  const parts = [
    field('00', '01'),
    field('01', amount ? '12' : '11'), // 12 = dynamic (one payment, amount locked)
    field('29', field('00', 'A000000677010111') + account),
    field('58', 'TH'),
    field('53', '764'), // THB
  ];
  if (amount) parts.push(field('54', Number(amount).toFixed(2)));
  const data = `${parts.join('')}6304`;
  return data + crc16(data);
}

/** "081-xxx-5678" style masking for showing the receiver without exposing the full ID. */
export function maskPromptPayId(raw) {
  const id = normalizePromptPayId(raw);
  if (id.length <= 4) return id;
  return `${'x'.repeat(id.length - 4)}${id.slice(-4)}`;
}
