import type { TickerRow } from '../../lib/types';

export type TickerQueryData = TickerRow[] | { rows: TickerRow[] } | undefined;

export function toTickerRows(input: TickerQueryData): TickerRow[] {
  if (!input) return [];
  return Array.isArray(input) ? input : input.rows;
}
