import { describe, it, expect } from 'vitest';
import { getActiveFilterChips } from '../utils/activeFilters';
import { SCREENER_DEFAULTS } from '../urlState';

describe('getActiveFilterChips', () => {
  it('returns no chips for defaults', () => {
    const chips = getActiveFilterChips(SCREENER_DEFAULTS);
    expect(chips).toEqual([]);
  });

  it('creates a Search chip for non-empty q', () => {
    const chips = getActiveFilterChips({ ...SCREENER_DEFAULTS, q: 'tsla' });
    expect(chips.map(c => c.id)).toEqual(['q']);
    expect(chips[0].label).toBe('Search: TSLA');
  });

  it('creates chips for numeric minimums', () => {
    const chips = getActiveFilterChips({
      ...SCREENER_DEFAULTS,
      siMin: 20,
      dtcMin: 3.2,
      rvolMin: 1.5,
    });

    expect(chips.map(c => c.id)).toEqual(['siMin', 'dtcMin', 'rvolMin']);
    expect(chips[0].label).toBe('SI ≥ 20%');
    expect(chips[1].label).toBe('DTC ≥ 3.2');
    expect(chips[2].label).toBe('RVOL ≥ 1.5');
  });

  it('creates a Catalyst chip when catalyst=true', () => {
    const chips = getActiveFilterChips({ ...SCREENER_DEFAULTS, catalyst: true });
    expect(chips.map(c => c.id)).toEqual(['catalyst']);
  });

  it('treats NaN numeric values as defaults (no chip)', () => {
    const chips = getActiveFilterChips({
      ...SCREENER_DEFAULTS,
      siMin: Number.NaN,
      dtcMin: Number.NaN,
      rvolMin: Number.NaN,
    });

    expect(chips).toEqual([]);
  });
});
