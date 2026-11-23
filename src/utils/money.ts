/**
 * Money helpers.
 *
 * All amounts are stored and passed around as INTEGER CENTS (6500 = €65.00).
 * Never use floats for money arithmetic. Only convert at the display edge.
 */

export const DEFAULT_CURRENCY = 'EUR';

/** Largest amount accepted for a single expense: 9,999,999.99 */
export const MAX_AMOUNT_CENTS = 999_999_999;

/**
 * Parse user input such as "65", "65.5", "65,50" or "  12.30 " into cents.
 * Accepts either "." or "," as the decimal separator (common in Europe),
 * but rejects thousands separators like "1,234.50" because they are ambiguous.
 *
 * Returns null when the input is not a valid positive amount.
 */
export function parseAmountToCents(input: string): number | null {
  const normalized = input.trim().replace(/\s+/g, '').replace(',', '.');
  if (!/^(\d+(\.\d{0,2})?|\.\d{1,2})$/.test(normalized)) return null;

  const [wholePart, fractionPart = ''] = normalized.split('.');
  const whole = wholePart === '' ? 0 : Number(wholePart);
  const fraction = Number(fractionPart.padEnd(2, '0'));
  const cents = whole * 100 + fraction;

  if (!Number.isSafeInteger(cents) || cents <= 0 || cents > MAX_AMOUNT_CENTS) return null;
  return cents;
}

/** Cents → plain editable string, e.g. 6550 → "65.50". */
export function centsToInputString(cents: number): string {
  const whole = Math.floor(cents / 100);
  const fraction = String(cents % 100).padStart(2, '0');
  return `${whole}.${fraction}`;
}

const formatters = new Map<string, Intl.NumberFormat>();

function getFormatter(currency: string, locale?: string): Intl.NumberFormat {
  const key = `${locale ?? ''}|${currency}`;
  let formatter = formatters.get(key);
  if (!formatter) {
    formatter = new Intl.NumberFormat(locale, { style: 'currency', currency });
    formatters.set(key, formatter);
  }
  return formatter;
}

/** Cents → localized currency string, e.g. 6500 → "€65.00" (or "65,00 €" in de-DE). */
export function formatCents(cents: number, currency = DEFAULT_CURRENCY, locale?: string): string {
  return getFormatter(currency, locale).format(cents / 100);
}

/** The currency symbol on its own, e.g. "€". */
export function currencySymbol(currency = DEFAULT_CURRENCY, locale?: string): string {
  return getFormatter(currency, locale).format(0).replace(/[\d\s.,  ]/g, '') || currency;
}

/** Sum a list of cent amounts (integers stay integers). */
export function sumCents(values: readonly number[]): number {
  return values.reduce((total, value) => total + value, 0);
}
