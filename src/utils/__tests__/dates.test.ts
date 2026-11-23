import {
  addDays,
  addMonths,
  currentMonth,
  defaultDateForMonth,
  formatDayHeader,
  formatMonthLabel,
  isValidISODate,
  isValidYearMonth,
  lastDayOfMonth,
  monthOf,
  monthRange,
  parseISODate,
  toISODate,
  todayISO,
} from '@/utils/dates';

// 23 Nov 2026, 23:30 local time: late evening must still count as the 23rd.
const NOW = new Date(2026, 10, 23, 23, 30);

describe('ISO date conversion', () => {
  it('uses local calendar dates, not UTC', () => {
    expect(toISODate(NOW)).toBe('2026-11-23');
    expect(todayISO(NOW)).toBe('2026-11-23');
    expect(currentMonth(NOW)).toBe('2026-11');
  });

  it('round-trips', () => {
    expect(toISODate(parseISODate('2026-03-29'))).toBe('2026-03-29');
  });

  it('validates dates', () => {
    expect(isValidISODate('2026-02-28')).toBe(true);
    expect(isValidISODate('2028-02-29')).toBe(true);
    expect(isValidISODate('2026-02-29')).toBe(false);
    expect(isValidISODate('2026-13-01')).toBe(false);
    expect(isValidISODate('26-1-1')).toBe(false);
  });

  it('validates months', () => {
    expect(isValidYearMonth('2026-11')).toBe(true);
    expect(isValidYearMonth('2026-13')).toBe(false);
    expect(isValidYearMonth('2026-1')).toBe(false);
  });
});

describe('day and month arithmetic', () => {
  it('adds days across month and year boundaries', () => {
    expect(addDays('2026-11-30', 1)).toBe('2026-12-01');
    expect(addDays('2027-01-01', -1)).toBe('2026-12-31');
  });

  it('adds months across year boundaries', () => {
    expect(addMonths('2026-11', 1)).toBe('2026-12');
    expect(addMonths('2026-12', 1)).toBe('2027-01');
    expect(addMonths('2026-01', -1)).toBe('2025-12');
    expect(addMonths('2026-05', -17)).toBe('2024-12');
  });

  it('builds half-open month ranges', () => {
    expect(monthRange('2026-12')).toEqual({ start: '2026-12-01', end: '2027-01-01' });
    expect(lastDayOfMonth('2026-02')).toBe('2026-02-28');
    expect(lastDayOfMonth('2028-02')).toBe('2028-02-29');
    expect(monthOf('2026-11-23')).toBe('2026-11');
  });

  it('picks a default date for a month', () => {
    expect(defaultDateForMonth('2026-11', NOW)).toBe('2026-11-23');
    expect(defaultDateForMonth('2026-10', NOW)).toBe('2026-10-31');
  });
});

describe('labels', () => {
  it('formats day headers', () => {
    expect(formatDayHeader('2026-11-23', NOW)).toBe('Today');
    expect(formatDayHeader('2026-11-22', NOW)).toBe('Yesterday');
    expect(formatDayHeader('2026-11-20', NOW, 'en-GB')).toBe('Fri 20 Nov');
  });

  it('formats month labels', () => {
    expect(formatMonthLabel('2026-11', 'en-GB')).toBe('November 2026');
  });
});
