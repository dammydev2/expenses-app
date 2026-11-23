import {
  centsToInputString,
  currencySymbol,
  formatCents,
  MAX_AMOUNT_CENTS,
  parseAmountToCents,
  sumCents,
} from '@/utils/money';

describe('parseAmountToCents', () => {
  it.each([
    ['65', 6500],
    ['65.5', 6550],
    ['65.50', 6550],
    ['65,50', 6550],
    [' 12.30 ', 1230],
    ['0.01', 1],
    ['.5', 50],
    ['1 000', 100000],
    ['65.', 6500],
  ])('parses %p as %p cents', (input, expected) => {
    expect(parseAmountToCents(input)).toBe(expected);
  });

  it.each(['', 'abc', '0', '0.00', '-5', '1.234', '1,234.50', '1.2.3', '€65', '.'])(
    'rejects %p',
    (input) => {
      expect(parseAmountToCents(input)).toBeNull();
    },
  );

  it('avoids float rounding errors', () => {
    expect(parseAmountToCents('0.29')).toBe(29); // 0.29 * 100 === 28.999999999999996 in floats
    expect(parseAmountToCents('1.15')).toBe(115);
  });

  it('enforces the maximum amount', () => {
    expect(parseAmountToCents('9999999.99')).toBe(MAX_AMOUNT_CENTS);
    expect(parseAmountToCents('10000000')).toBeNull();
  });
});

describe('centsToInputString', () => {
  it('formats cents for an editable input', () => {
    expect(centsToInputString(6550)).toBe('65.50');
    expect(centsToInputString(5)).toBe('0.05');
    expect(centsToInputString(100000)).toBe('1000.00');
  });

  it('round-trips with parseAmountToCents', () => {
    for (const cents of [1, 29, 115, 6550, 999_999_999]) {
      expect(parseAmountToCents(centsToInputString(cents))).toBe(cents);
    }
  });
});

describe('formatCents / currencySymbol', () => {
  it('formats with the given locale', () => {
    expect(formatCents(6500, 'EUR', 'en-IE')).toBe('€65.00');
    expect(formatCents(6500, 'EUR', 'de-DE').replace(/\s/g, ' ')).toBe('65,00 €');
  });

  it('extracts the currency symbol', () => {
    expect(currencySymbol('EUR', 'en-IE')).toBe('€');
    expect(currencySymbol('EUR', 'de-DE')).toBe('€');
  });
});

describe('sumCents', () => {
  it('sums integers', () => {
    expect(sumCents([6500, 4000, 1])).toBe(10501);
    expect(sumCents([])).toBe(0);
  });
});
