import type { TickerRow } from '../../lib/types';

export type FilterParams = {
  q?: string; // ticker substring is NOT case-sensitive
  siMin?: number;
  dtcMin?: number;
  rvolMin?: number;
  catalyst?: boolean; // only rows with catalyst=true
};

/**
 * Returns a new array filtered by the provided params.
 * - Matching is NOT case-sensitive for `q` against ticker
 * - Undefined params are ignored
 * - Input is not mutated
 */
export function filterRows(rows: TickerRow[], p: FilterParams): TickerRow[] {
  const q = (p.q ?? '').trim().toLowerCase();
  const siMin = p.siMin ?? 0;
  const dtcMin = p.dtcMin ?? 0;
  const rvolMin = p.rvolMin ?? 0;
  const requireCatalyst = Boolean(p.catalyst);

  return rows.filter((r) => {
    if (q && !r.ticker.toLowerCase().includes(q)) return false;
    if (r.siPublic < siMin) return false;
    if (r.dtc < dtcMin) return false;
    if (r.rvol < rvolMin) return false;
    if (requireCatalyst && !r.catalyst) return false;
    return true;
  });
}
