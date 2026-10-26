import { describe, it, expect } from 'vitest';
import { filterRows, type FilterParams } from '../../tickers/filter';
import type { TickerRow } from '../../../lib/types';

function makeTickerRow(
  partial: Partial<TickerRow> & Pick<TickerRow, 'ticker'>
): TickerRow {
  return {
    price: 0,
    pctChange: 0,
    siPublic: 0,
    siBroad: 0,
    dtc: 0,
    rvol: 0,
    catalyst: false,
    ...partial,
  };
}

const rows: TickerRow[] = [
  makeTickerRow({ ticker: 'TSLA', siPublic: 12, dtc: 1.1, rvol: 1.5, catalyst: true }),
  makeTickerRow({ ticker: 'AAPL', siPublic: 5,  dtc: 0.3, rvol: 0.8 }),
  makeTickerRow({ ticker: 'NVDA', siPublic: 3,  dtc: 0.2, rvol: 2.1 }),
];

describe('filterRows', () => {
  it('returns all rows when no filters provided', () => {
    const out = filterRows(rows, {});
    expect(out).toHaveLength(3);
  });

  it('filters by case-insensitive substring match on ticker (q)', () => {
    const out = filterRows(rows, { q: 'nv' });
    expect(out.map(r => r.ticker)).toEqual(['NVDA']);
  });

  it('applies numeric minimums (siMin, dtcMin, rvolMin)', () => {
    const params: FilterParams = { siMin: 6, dtcMin: 0.5, rvolMin: 1.0 };
    const out = filterRows(rows, params);
    expect(out.map(r => r.ticker)).toEqual(['TSLA']); // only TSLA meets all mins with current mock data.
  });

  it('filters by catalyst=true when requested', () => {
    const out = filterRows(rows, { catalyst: true });
    expect(out.map(r => r.ticker)).toEqual(['TSLA']);
  });
});

describe('filterRows edge cases', () => {
  const edge: TickerRow[] = [
    makeTickerRow({ ticker: 'AAA', siPublic: 10, siBroad: 50, dtc: 2, rvol: 1.5, catalyst: true }),
    makeTickerRow({ ticker: 'AAB', siPublic: 9.99, siBroad: 9, dtc: 1.99, rvol: 1.49 }),
    makeTickerRow({ ticker: 'XYZ', siPublic: 30, siBroad: 30, dtc: 5, rvol: 3, catalyst: true }),
  ];
  const tickers = (out: TickerRow[]) => out.map((r) => r.ticker);

  it('treats minimums as inclusive (>=)', () => {
    expect(tickers(filterRows(edge, { siMin: 10 }))).toEqual(['AAA', 'XYZ']);
    expect(tickers(filterRows(edge, { dtcMin: 2 }))).toEqual(['AAA', 'XYZ']);
    expect(tickers(filterRows(edge, { rvolMin: 1.5 }))).toEqual(['AAA', 'XYZ']);
  });

  it('applies siMin to public float only (not broad float)', () => {
    // AAB has siBroad 9 and AAA has siBroad 50; only siPublic decides.
    expect(tickers(filterRows(edge, { siMin: 20 }))).toEqual(['XYZ']);
  });

  it('trims the search term and matches substrings anywhere in the ticker', () => {
    expect(tickers(filterRows(edge, { q: '  aa ' }))).toEqual(['AAA', 'AAB']);
    expect(tickers(filterRows(edge, { q: 'yz' }))).toEqual(['XYZ']);
    expect(tickers(filterRows(edge, { q: '   ' }))).toEqual(['AAA', 'AAB', 'XYZ']);
  });

  it('ignores NaN thresholds (emptied number inputs)', () => {
    expect(filterRows(edge, { siMin: NaN, dtcMin: NaN, rvolMin: NaN })).toHaveLength(3);
  });

  it('combines all filters with AND', () => {
    expect(
      tickers(filterRows(edge, { q: 'a', siMin: 5, dtcMin: 1, rvolMin: 1, catalyst: true }))
    ).toEqual(['AAA']);
  });

  it('returns an empty array when nothing matches and keeps input order otherwise', () => {
    expect(filterRows(edge, { q: 'nope' })).toEqual([]);
    expect(filterRows([], { siMin: 1 })).toEqual([]);
    expect(tickers(filterRows(edge, {}))).toEqual(['AAA', 'AAB', 'XYZ']);
  });

  it('does not mutate the input array', () => {
    const copy = edge.slice();
    const out = filterRows(edge, { siMin: 10 });
    expect(edge).toEqual(copy);
    expect(out).not.toBe(edge);
  });
});
