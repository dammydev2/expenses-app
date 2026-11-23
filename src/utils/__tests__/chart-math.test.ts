import type { CategoryTotal } from '@/db/repos/reports';
import {
  columnPath,
  daysElapsed,
  donutPaths,
  fillDailyTotals,
  foldCategories,
  formatShare,
  niceAxis,
  OTHER_KEY,
} from '@/utils/chart-math';
import { formatAxisAmount } from '@/utils/money';

const cat = (name: string, totalCents: number, color = '#2a78d6'): CategoryTotal => ({
  categoryId: name.toLowerCase(),
  name,
  icon: 'tag',
  color,
  totalCents,
  count: 1,
});

describe('foldCategories', () => {
  it('returns nothing for no spending', () => {
    expect(foldCategories([])).toEqual([]);
  });

  it('keeps up to 5 named slices and folds the rest into Other', () => {
    const totals = [
      cat('A', 600),
      cat('B', 500),
      cat('C', 400),
      cat('D', 300),
      cat('E', 200),
      cat('F', 100),
      cat('G', 100),
    ];
    const slices = foldCategories(totals);
    expect(slices.map((s) => s.label)).toEqual(['A', 'B', 'C', 'D', 'E', 'Other']);
    expect(slices.at(-1)).toMatchObject({ key: OTHER_KEY, totalCents: 200, isOther: true });
    expect(slices.reduce((sum, s) => sum + s.share, 0)).toBeCloseTo(1);
  });

  it('always puts grey catch-all categories into Other (never two greys)', () => {
    const slices = foldCategories([cat('Other', 900, '#898781'), cat('Groceries', 100)]);
    expect(slices.map((s) => s.label)).toEqual(['Groceries', 'Other']);
    expect(slices[1].totalCents).toBe(900);
  });

  it('adds no Other slice when everything fits', () => {
    const slices = foldCategories([cat('A', 300), cat('B', 100)]);
    expect(slices.map((s) => s.label)).toEqual(['A', 'B']);
    expect(slices[0].share).toBe(0.75);
  });
});

describe('formatShare', () => {
  it('rounds to whole percent and never shows 0% for real spending', () => {
    expect(formatShare(0.4567)).toBe('46%');
    expect(formatShare(0.001)).toBe('<1%');
    expect(formatShare(0)).toBe('0%');
  });
});

describe('fillDailyTotals / daysElapsed', () => {
  const now = new Date(2026, 10, 23, 23, 30); // 23 Nov 2026

  it('returns every day of the month with zeros filled in', () => {
    const points = fillDailyTotals('2026-11', [{ day: '2026-11-05', totalCents: 4200, count: 2 }], now);
    expect(points).toHaveLength(30);
    expect(points[0]).toMatchObject({ day: '2026-11-01', dayOfMonth: 1, totalCents: 0, isFuture: false });
    expect(points[4]).toMatchObject({ day: '2026-11-05', totalCents: 4200, count: 2 });
    expect(points[22].isFuture).toBe(false); // today
    expect(points[23].isFuture).toBe(true); // tomorrow
  });

  it('handles February in leap years', () => {
    expect(fillDailyTotals('2028-02', [], now)).toHaveLength(29);
  });

  it('counts elapsed days for averaging', () => {
    expect(daysElapsed('2026-11', now)).toBe(23);
    expect(daysElapsed('2026-10', now)).toBe(31);
    expect(daysElapsed('2026-12', now)).toBe(0);
  });
});

describe('niceAxis', () => {
  it.each([
    [0, [0, 100]],
    [4_500, [0, 1000, 2000, 3000, 4000, 5000]],
    [8_240, [0, 2000, 4000, 6000, 8000, 10000]],
    [12_000, [0, 5000, 10000, 15000]],
    [95_000, [0, 20000, 40000, 60000, 80000, 100000]],
  ])('max %p cents → ticks %p', (max, ticks) => {
    const axis = niceAxis(max);
    expect(axis.ticks).toEqual(ticks);
    expect(axis.top).toBe(ticks.at(-1));
    expect(axis.top).toBeGreaterThanOrEqual(max);
  });
});

describe('formatAxisAmount', () => {
  it('formats whole amounts and compacts large ones', () => {
    expect(formatAxisAmount(5000, 'EUR', 'en-IE')).toBe('€50');
    expect(formatAxisAmount(0, 'EUR', 'en-IE')).toBe('€0');
    expect(formatAxisAmount(1_250_000, 'EUR', 'en-IE')).toBe('€12.5K');
  });
});

describe('columnPath', () => {
  it('rounds the top corners only and sits on the baseline', () => {
    const d = columnPath(10, 100, 8, 50);
    expect(d.startsWith('M10 100 L10 54')).toBe(true); // 4px radius below the top (y=50)
    expect(d).toContain('L18 100 Z');
  });

  it('shrinks the radius for tiny bars and draws nothing for zero', () => {
    expect(columnPath(0, 100, 8, 2)).toContain('Q0 98 2 98'); // radius limited to height (2)
    expect(columnPath(0, 100, 8, 0)).toBe('');
  });
});

describe('donutPaths', () => {
  const opts = { cx: 100, cy: 100, outer: 90, inner: 66, gap: 2 };

  it('draws one path per value, skipping zeros', () => {
    const paths = donutPaths([3, 0, 1], opts);
    expect(paths).toHaveLength(3);
    expect(paths[0]).toMatch(/^M/);
    expect(paths[1]).toBe('');
    expect(paths[2]).toMatch(/^M/);
  });

  it('uses the large-arc flag for a segment over half the ring', () => {
    const [big, small] = donutPaths([3, 1], opts);
    expect(big).toMatch(/A90 90 0 1 1/);
    expect(small).toMatch(/A90 90 0 0 1/);
  });

  it('draws a full ring for a single category', () => {
    const [ring] = donutPaths([5], opts);
    expect(ring.match(/A90 90/g)).toHaveLength(2);
    expect(ring.match(/A66 66/g)).toHaveLength(2);
  });

  it('draws nothing when there is no data', () => {
    expect(donutPaths([0, 0], opts)).toEqual(['', '']);
  });
});
