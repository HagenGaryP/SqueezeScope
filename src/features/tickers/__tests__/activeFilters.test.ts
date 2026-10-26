import { describe, it, expect } from 'vitest';
import { getActiveFilters } from '../activeFilters';
import { SCREENER_DEFAULTS, type ScreenerValues } from '../screenerSchema';

function values(partial: Partial<ScreenerValues> = {}): ScreenerValues {
  return { ...SCREENER_DEFAULTS, ...partial };
}

describe('getActiveFilters', () => {
  it('returns no filters for default values', () => {
    expect(getActiveFilters(values())).toEqual([]);
  });

  it('ignores sort and direction (not filters)', () => {
    expect(getActiveFilters(values({ sort: 'dtc', dir: 'desc' }))).toEqual([]);
  });

  it('returns one descriptor per non-default filter, in toolbar order', () => {
    const out = getActiveFilters(
      values({ q: 'gme', siMin: 10, dtcMin: 2.5, rvolMin: 1.5, catalyst: true })
    );
    expect(out.map((f) => f.key)).toEqual(['q', 'siMin', 'dtcMin', 'rvolMin', 'catalyst']);
  });

  it('builds readable chip text and descriptive remove labels', () => {
    const out = getActiveFilters(values({ q: 'gme', siMin: 10, catalyst: true }));
    expect(out).toEqual([
      { key: 'q', text: 'Search: gme', removeLabel: 'Remove Search filter: Search: gme' },
      { key: 'siMin', text: 'SI% ≥ 10', removeLabel: 'Remove Short interest filter: SI% ≥ 10' },
      { key: 'catalyst', text: 'Catalyst only', removeLabel: 'Remove Catalyst filter: Catalyst only' },
    ]);
  });

  it('includes the visible chip text in every remove label', () => {
    const out = getActiveFilters(
      values({ q: 'x', siMin: 1, dtcMin: 1, rvolMin: 1, catalyst: true })
    );
    for (const f of out) expect(f.removeLabel).toContain(f.text);
  });

  it('treats whitespace-only search as inactive and trims chip text', () => {
    expect(getActiveFilters(values({ q: '   ' }))).toEqual([]);
    expect(getActiveFilters(values({ q: '  amc ' }))[0].text).toBe('Search: amc');
  });

  it('treats NaN numeric values (emptied number inputs) as inactive', () => {
    expect(getActiveFilters(values({ siMin: NaN, dtcMin: NaN, rvolMin: NaN }))).toEqual([]);
  });

  it('tolerates partial values from form watchers', () => {
    expect(getActiveFilters({ rvolMin: 2 }).map((f) => f.key)).toEqual(['rvolMin']);
  });
});
