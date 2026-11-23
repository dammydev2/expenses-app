/**
 * Pure chart maths: data shaping, axis ticks and SVG geometry.
 * No React / native imports, so everything here is unit-tested.
 */
import { isNeutralColor, NEUTRAL } from '@/constants/chart-palette';
import type { CategoryTotal, DailyTotal } from '@/db/repos/reports';
import { addDays, lastDayOfMonth, todayISO, type ISODate, type YearMonth } from '@/utils/dates';

// ── Category slices ──────────────────────────────────────────────────────────

export type Slice = {
  key: string;
  label: string;
  icon: string;
  color: string; // stored (light) hex
  totalCents: number;
  share: number; // 0..1
  isOther: boolean;
};

export const OTHER_KEY = '__other__';

/**
 * Fold category totals into at most `maxNamed` named slices plus one grey "Other".
 * Catch-all (grey) categories always go into "Other", so the chart never shows two greys.
 * Input must be sorted largest first (as returned by categoryTotalsForMonth).
 */
export function foldCategories(totals: readonly CategoryTotal[], maxNamed = 5): Slice[] {
  const grandTotal = totals.reduce((sum, t) => sum + t.totalCents, 0);
  if (grandTotal === 0) return [];

  const named = totals.filter((t) => !isNeutralColor(t.color));
  const shown = named.slice(0, maxNamed);
  const shownIds = new Set(shown.map((t) => t.categoryId));
  const otherCents = totals
    .filter((t) => !shownIds.has(t.categoryId))
    .reduce((sum, t) => sum + t.totalCents, 0);

  const slices: Slice[] = shown.map((t) => ({
    key: t.categoryId,
    label: t.name,
    icon: t.icon,
    color: t.color,
    totalCents: t.totalCents,
    share: t.totalCents / grandTotal,
    isOther: false,
  }));

  if (otherCents > 0) {
    slices.push({
      key: OTHER_KEY,
      label: 'Other',
      icon: 'dots-horizontal',
      color: NEUTRAL.light,
      totalCents: otherCents,
      share: otherCents / grandTotal,
      isOther: true,
    });
  }
  return slices;
}

/** Whole-number percentage for display; never shows 0% for a non-zero share. */
export function formatShare(share: number): string {
  if (share > 0 && share < 0.005) return '<1%';
  return `${Math.round(share * 100)}%`;
}

// ── Daily series ─────────────────────────────────────────────────────────────

export type DayPoint = {
  day: ISODate;
  dayOfMonth: number;
  totalCents: number;
  count: number;
  isFuture: boolean;
};

/** Every day of the month, with zeros for days without spending. */
export function fillDailyTotals(
  month: YearMonth,
  rows: readonly DailyTotal[],
  now = new Date(),
): DayPoint[] {
  const byDay = new Map(rows.map((r) => [r.day, r]));
  const today = todayISO(now);
  const last = lastDayOfMonth(month);
  const points: DayPoint[] = [];
  for (let day = `${month}-01`; day <= last; day = addDays(day, 1)) {
    const row = byDay.get(day);
    points.push({
      day,
      dayOfMonth: Number(day.slice(8)),
      totalCents: row?.totalCents ?? 0,
      count: row?.count ?? 0,
      isFuture: day > today,
    });
  }
  return points;
}

/** Days to average over: elapsed days for the current month, all days for past months. */
export function daysElapsed(month: YearMonth, now = new Date()): number {
  const today = todayISO(now);
  const last = lastDayOfMonth(month);
  if (today < `${month}-01`) return 0;
  if (today > last) return Number(last.slice(8));
  return Number(today.slice(8));
}

// ── Axis ─────────────────────────────────────────────────────────────────────

/**
 * "Nice" axis for an amount in cents: the smallest clean whole-currency step
 * (1, 2, 5 × 10ⁿ) that covers the maximum in at most `maxIntervals` intervals,
 * so the tallest bar uses as much of the plot as possible.
 * Returns tick values in cents, starting at 0.
 */
export function niceAxis(maxCents: number, maxIntervals = 5): { ticks: number[]; top: number } {
  const max = Math.max(maxCents / 100, 1);
  let step = 1;
  for (let magnitude = 1; ; magnitude *= 10) {
    const fit = [1, 2, 5].map((m) => m * magnitude).find((s) => Math.ceil(max / s) <= maxIntervals);
    if (fit) {
      step = fit;
      break;
    }
  }
  const top = Math.ceil(max / step) * step;

  const ticks: number[] = [];
  for (let value = 0; value <= top + step / 2; value += step) {
    ticks.push(Math.round(value * 100));
  }
  return { ticks, top: Math.round(top * 100) };
}

// ── SVG geometry ─────────────────────────────────────────────────────────────

const round = (n: number) => Math.round(n * 100) / 100;

/**
 * Column with a 4px rounded data-end (top) and a square base on the baseline.
 * The radius shrinks for very short or narrow bars.
 */
export function columnPath(x: number, baselineY: number, width: number, height: number, radius = 4) {
  if (height <= 0 || width <= 0) return '';
  const r = Math.min(radius, width / 2, height);
  const top = baselineY - height;
  return [
    `M${round(x)} ${round(baselineY)}`,
    `L${round(x)} ${round(top + r)}`,
    `Q${round(x)} ${round(top)} ${round(x + r)} ${round(top)}`,
    `L${round(x + width - r)} ${round(top)}`,
    `Q${round(x + width)} ${round(top)} ${round(x + width)} ${round(top + r)}`,
    `L${round(x + width)} ${round(baselineY)}`,
    'Z',
  ].join(' ');
}

type DonutOptions = { cx: number; cy: number; outer: number; inner: number; gap?: number };

const polar = (cx: number, cy: number, r: number, angle: number) =>
  `${round(cx + r * Math.cos(angle))} ${round(cy + r * Math.sin(angle))}`;

/**
 * Ring segments for a donut, clockwise from 12 o'clock, separated by a constant
 * `gap`-pixel surface gap (the gap stays parallel because it is applied per radius).
 * Returns one SVG path per value ('' for a zero or too-small value).
 */
export function donutPaths(values: readonly number[], options: DonutOptions): string[] {
  const { cx, cy, outer, inner, gap = 2 } = options;
  const total = values.reduce((sum, v) => sum + Math.max(0, v), 0);
  if (total === 0) return values.map(() => '');

  const nonZero = values.filter((v) => v > 0).length;
  if (nonZero === 1) {
    // A single full ring: two concentric circles, drawn with the even-odd rule.
    const ring = (r: number) =>
      `M${round(cx - r)} ${round(cy)} A${r} ${r} 0 1 1 ${round(cx + r)} ${round(cy)} A${r} ${r} 0 1 1 ${round(cx - r)} ${round(cy)} Z`;
    return values.map((v) => (v > 0 ? `${ring(outer)} ${ring(inner)}` : ''));
  }

  let start = -Math.PI / 2;
  return values.map((value) => {
    const sweep = (Math.max(0, value) / total) * Math.PI * 2;
    const end = start + sweep;
    const a0o = start + gap / 2 / outer;
    const a1o = end - gap / 2 / outer;
    const a0i = start + gap / 2 / inner;
    const a1i = end - gap / 2 / inner;
    start = end;
    if (value <= 0 || a1i <= a0i) return '';
    const largeOuter = a1o - a0o > Math.PI ? 1 : 0;
    const largeInner = a1i - a0i > Math.PI ? 1 : 0;
    return [
      `M${polar(cx, cy, outer, a0o)}`,
      `A${outer} ${outer} 0 ${largeOuter} 1 ${polar(cx, cy, outer, a1o)}`,
      `L${polar(cx, cy, inner, a1i)}`,
      `A${inner} ${inner} 0 ${largeInner} 0 ${polar(cx, cy, inner, a0i)}`,
      'Z',
    ].join(' ');
  });
}
