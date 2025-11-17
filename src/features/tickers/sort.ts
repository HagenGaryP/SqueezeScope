// Sorting utilities for the screener.

import type { TickerRow } from '../../lib/types';

export type SortKey =
  | 'ticker'
  | 'price'
  | 'pctChange'
  | 'siPublic'
  | 'siBroad'
  | 'dtc'
  | 'rvol';

export type SortDir = 'asc' | 'desc';

// Derive the subset of keys on TickerRow whose values are number.
type NumericKeys<T> = {
  [K in keyof T]: T[K] extends number ? K : never;
}[keyof T];

type NumericTickerKey = Extract<NumericKeys<TickerRow>, SortKey>;

const orderFactor = (dir: SortDir) => (dir === 'asc' ? 1 : -1);

const isNumericKey = (key: SortKey): key is NumericTickerKey =>
  key !== 'ticker';

/** Compare by ticker (string) with direction. */
function compareByTicker(dir: SortDir) {
  const factor = orderFactor(dir);
  return (rowA: TickerRow, rowB: TickerRow) =>
    rowA.ticker.localeCompare(rowB.ticker) * factor;
}

/** Compare by a numeric key with direction (no casts needed). */
function compareByNumber(key: NumericTickerKey, dir: SortDir) {
  const factor = orderFactor(dir);
  return (rowA: TickerRow, rowB: TickerRow) =>
    (rowA[key] - rowB[key]) * factor;
}

/**
 * Returns a new array sorted by the given key/direction.
 */
export function sortRows(
  rows: TickerRow[],
  key: SortKey,
  dir: SortDir
): TickerRow[] {
  if (rows.length <= 1) return rows.slice();

  return [...rows].sort(
    isNumericKey(key) ? compareByNumber(key, dir) : compareByTicker(dir)
  );
}
