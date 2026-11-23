/**
 * Date helpers.
 *
 * Expense dates are LOCAL calendar dates stored as 'YYYY-MM-DD' strings,
 * and months as 'YYYY-MM'. We deliberately avoid UTC timestamps for these so an
 * expense logged at 23:30 never shifts to the next day (or month).
 */

export type ISODate = string; // 'YYYY-MM-DD'
export type YearMonth = string; // 'YYYY-MM'

const pad = (n: number) => String(n).padStart(2, '0');

/** Date object → local 'YYYY-MM-DD'. */
export function toISODate(date: Date): ISODate {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** 'YYYY-MM-DD' → Date at local noon (noon avoids DST edge cases). */
export function parseISODate(iso: ISODate): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d, 12);
}

export function isValidISODate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  return toISODate(parseISODate(value)) === value;
}

export function isValidYearMonth(value: string): boolean {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
}

export function todayISO(now = new Date()): ISODate {
  return toISODate(now);
}

export function addDays(iso: ISODate, days: number): ISODate {
  const date = parseISODate(iso);
  date.setDate(date.getDate() + days);
  return toISODate(date);
}

export function monthOf(iso: ISODate): YearMonth {
  return iso.slice(0, 7);
}

export function currentMonth(now = new Date()): YearMonth {
  return monthOf(todayISO(now));
}

/** Add (or subtract) whole months: addMonths('2026-01', -1) → '2025-12'. */
export function addMonths(month: YearMonth, delta: number): YearMonth {
  const [y, m] = month.split('-').map(Number);
  const index = y * 12 + (m - 1) + delta;
  return `${Math.floor(index / 12)}-${pad((index % 12) + 1)}`;
}

/** Half-open range for SQL: spent_on >= start AND spent_on < end. */
export function monthRange(month: YearMonth): { start: ISODate; end: ISODate } {
  return { start: `${month}-01`, end: `${addMonths(month, 1)}-01` };
}

export function lastDayOfMonth(month: YearMonth): ISODate {
  return addDays(monthRange(month).end, -1);
}

/**
 * Sensible default date for a new expense while viewing `month`:
 * today for the current month, otherwise the last day of that month.
 */
export function defaultDateForMonth(month: YearMonth, now = new Date()): ISODate {
  const today = todayISO(now);
  return monthOf(today) === month ? today : lastDayOfMonth(month);
}

/** 'YYYY-MM' → "November 2026" (localized). */
export function formatMonthLabel(month: YearMonth, locale?: string): string {
  return new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(
    parseISODate(`${month}-01`),
  );
}

/** 'YYYY-MM-DD' → "Mon, 23 Nov 2026" (localized). */
export function formatLongDate(iso: ISODate, locale?: string): string {
  return new Intl.DateTimeFormat(locale, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(parseISODate(iso));
}

/** Section header label: "Today", "Yesterday" or "Mon, 23 Nov". */
export function formatDayHeader(iso: ISODate, now = new Date(), locale?: string): string {
  const today = todayISO(now);
  if (iso === today) return 'Today';
  if (iso === addDays(today, -1)) return 'Yesterday';
  return new Intl.DateTimeFormat(locale, { weekday: 'short', day: 'numeric', month: 'short' }).format(
    parseISODate(iso),
  );
}

/** Current timestamp for created_at / updated_at columns. */
export function nowTimestamp(): string {
  return new Date().toISOString();
}
