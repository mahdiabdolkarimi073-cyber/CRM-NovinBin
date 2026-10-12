// Phone normalization utility — converts Iranian mobile numbers to a single canonical format.
// Canonical format: 09XXXXXXXXX (11 digits, starts with 09)
// Accepted inputs: 09123456789, +989123456789, 00989123456789, 989123456789,
//                  0912-345-6789, 0912 345 6789, etc.

const IRAN_MOBILE_REGEX = /^09\d{9}$/;

/**
 * Strip spaces, dashes, dots, parentheses from a phone string.
 */
function cleanPhone(raw: string): string {
  return raw.replace(/[\s\-().]/g, '').trim();
}

/**
 * Normalize an Iranian mobile number to canonical format: 09XXXXXXXXX
 *
 * Returns null if the number is not a valid Iranian mobile.
 */
export function normalizePhone(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const cleaned = cleanPhone(String(raw));
  if (!cleaned) return null;

  // Already canonical: 09XXXXXXXXX
  if (/^09\d{9}$/.test(cleaned)) return cleaned;

  // +98 9XXXXXXXXX -> 0 + 9XXXXXXXXX
  if (/^\+989\d{9}$/.test(cleaned)) return '0' + cleaned.slice(3);

  // 0098 9XXXXXXXXX -> 0 + 9XXXXXXXXX
  if (/^00989\d{9}$/.test(cleaned)) return '0' + cleaned.slice(4);

  // 98 9XXXXXXXXX (without +) -> 0 + 9XXXXXXXXX
  if (/^989\d{9}$/.test(cleaned)) return '0' + cleaned.slice(2);

  // 9XXXXXXXXX (without leading 0) -> 09XXXXXXXXX
  if (/^9\d{9}$/.test(cleaned)) return '0' + cleaned;

  return null;
}

/**
 * Validate whether a string is a valid Iranian mobile number (in any supported format).
 */
export function isValidMobile(raw: string | null | undefined): boolean {
  return normalizePhone(raw) !== null;
}

/**
 * Normalize a phone or throw a descriptive error (for API handlers).
 */
export function normalizePhoneOrThrow(raw: string | null | undefined, fieldName = 'شماره موبایل'): string {
  const normalized = normalizePhone(raw);
  if (!normalized) {
    throw new Error(`${fieldName} نامعتبر است. فرمت صحیح: 09XXXXXXXXX یا +989XXXXXXXXX`);
  }
  return normalized;
}

export { IRAN_MOBILE_REGEX };
