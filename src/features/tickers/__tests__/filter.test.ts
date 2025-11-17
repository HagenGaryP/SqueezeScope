import { describe, it, expect } from 'vitest';
import { filterRows, type FilterParams } from '../../tickers/filter';
import type { TickerRow } from '../../../lib/types';

function makeTickerRow(
  partial: Partial<TickerRow> & Pick<TickerRow, 'ticker'>
): TickerRow {
  return {
    ticker: partial.ticker,
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
