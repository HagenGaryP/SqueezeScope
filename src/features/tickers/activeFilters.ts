import type { FilterKey, ScreenerValues } from './screenerSchema';

export type ActiveFilter = {
  key: FilterKey;
  /** Visible chip text, e.g. "SI% ≥ 10". */
  text: string;
  /** Accessible name for the chip's remove action. */
  removeLabel: string;
};

const isSet = (n: number | undefined): n is number =>
  typeof n === 'number' && !Number.isNaN(n) && n !== 0;

/**
 * Derives chip descriptors for every filter that differs from its default.
 * Pure: takes (possibly partial) form values, returns a new array in toolbar order.
 * Sort and direction are not filters and never produce chips.
 */
export function getActiveFilters(v: Partial<ScreenerValues>): ActiveFilter[] {
  const out: ActiveFilter[] = [];

  const q = (v.q ?? '').trim();
  if (q) {
    out.push({ key: 'q', text: `Search: ${q}`, removeLabel: 'Remove Search filter' });
  }
  if (isSet(v.siMin)) {
    out.push({ key: 'siMin', text: `SI% ≥ ${v.siMin}`, removeLabel: 'Remove Short interest filter' });
  }
  if (isSet(v.dtcMin)) {
    out.push({ key: 'dtcMin', text: `DTC ≥ ${v.dtcMin}`, removeLabel: 'Remove Days to cover filter' });
  }
  if (isSet(v.rvolMin)) {
    out.push({ key: 'rvolMin', text: `RVOL ≥ ${v.rvolMin}`, removeLabel: 'Remove Relative volume filter' });
  }
  if (v.catalyst) {
    out.push({ key: 'catalyst', text: 'Catalyst only', removeLabel: 'Remove Catalyst filter' });
  }

  return out;
}
