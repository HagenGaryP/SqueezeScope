import { describe, it, expect } from 'vitest';
import {
  formatPrice,
  formatPercentChange,
  formatPercent1,
  formatOneDecimal,
  formatScore,
} from '../format';

const formatters = [formatPrice, formatPercentChange, formatPercent1, formatOneDecimal, formatScore];

describe('format helpers', () => {
  it.each(formatters.map((f) => [f.name, f] as const))('%s renders an em dash for null, undefined and NaN', (_, f) => {
    expect(f(null)).toBe('—');
    expect(f(undefined)).toBe('—');
    expect(f(NaN)).toBe('—');
  });

  it('formatPrice uses two decimals', () => {
    expect(formatPrice(0.07)).toBe('0.07');
    expect(formatPrice(42.3)).toBe('42.30');
    expect(formatPrice(0)).toBe('0.00');
  });

  it('formatPercentChange prefixes positives with + and keeps the minus sign', () => {
    expect(formatPercentChange(3.5)).toBe('+3.50%');
    expect(formatPercentChange(-12.3)).toBe('-12.30%');
    expect(formatPercentChange(0)).toBe('0.00%');
  });

  it('formatPercent1 and formatOneDecimal use one decimal', () => {
    expect(formatPercent1(18.25)).toBe('18.3%');
    expect(formatOneDecimal(1.64)).toBe('1.6');
  });

  it('formatScore rounds to an integer', () => {
    expect(formatScore(41.6)).toBe('42');
    expect(formatScore(0.4)).toBe('0');
    expect(formatScore(100)).toBe('100');
  });
});
