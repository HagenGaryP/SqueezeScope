import type { FilterKey, ScreenerValues } from './screenerSchema';

export type ActiveFilter = {
  key: FilterKey;
  /** Visible chip text, e.g. "SI% ≥ 10". */
  text: string;
  /** Accessible name for the chip's remove action; includes the visible text (WCAG 2.5.3). */
  removeLabel: string;
};

const removeLabel = (name: string, text: string) => `Remove ${name} filter: ${text}`;

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
    const text = `Search: ${q}`;
    out.push({ key: 'q', text, removeLabel: removeLabel('Search', text) });
  }
  if (isSet(v.siMin)) {
    const text = `SI% ≥ ${v.siMin}`;
    out.push({ key: 'siMin', text, removeLabel: removeLabel('Short interest', text) });
  }
  if (isSet(v.dtcMin)) {
    const text = `DTC ≥ ${v.dtcMin}`;
    out.push({ key: 'dtcMin', text, removeLabel: removeLabel('Days to cover', text) });
  }
  if (isSet(v.rvolMin)) {
    const text = `RVOL ≥ ${v.rvolMin}`;
    out.push({ key: 'rvolMin', text, removeLabel: removeLabel('Relative volume', text) });
  }
  if (v.catalyst) {
    const text = 'Catalyst only';
    out.push({ key: 'catalyst', text, removeLabel: removeLabel('Catalyst', text) });
  }

  return out;
}
