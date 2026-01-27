import type { ScreenerValues } from '../screenerSchema';
import { SCREENER_DEFAULTS } from '../urlState';

export type ActiveFilterId = 'q' | 'siMin' | 'dtcMin' | 'rvolMin' | 'catalyst';

export type ActiveFilterChip = {
  id: ActiveFilterId;
  label: string;
  ariaLabel: string;
  clearValue: ScreenerValues[ActiveFilterId];
};

function finiteOr<T extends number>(value: T, fallback: T): T {
  return Number.isFinite(value) ? value : fallback;
}

export function getActiveFilterChips(
  values: ScreenerValues,
  defaults: ScreenerValues = SCREENER_DEFAULTS
): ActiveFilterChip[] {
  const chips: ActiveFilterChip[] = [];

  // q (Search)
  const q = (values.q ?? '').trim();
  if (q !== (defaults.q ?? '').trim()) {
    chips.push({
      id: 'q',
      label: `Search: ${q.toUpperCase()}`,
      ariaLabel: 'Remove search filter',
      clearValue: defaults.q,
    });
  }

  // siMin
  const siMin = finiteOr(values.siMin, defaults.siMin);
  if (siMin !== defaults.siMin) {
    const rounded = Math.round(siMin);
    chips.push({
      id: 'siMin',
      label: `SI ≥ ${rounded}%`,
      ariaLabel: 'Remove Short Interest minimum filter',
      clearValue: defaults.siMin,
    });
  }

  // dtcMin
  const dtcMin = finiteOr(values.dtcMin, defaults.dtcMin);
  if (dtcMin !== defaults.dtcMin) {
    chips.push({
      id: 'dtcMin',
      label: `DTC ≥ ${dtcMin.toFixed(1)}`,
      ariaLabel: 'Remove Days-to-Cover minimum filter',
      clearValue: defaults.dtcMin,
    });
  }

  // rvolMin
  const rvolMin = finiteOr(values.rvolMin, defaults.rvolMin);
  if (rvolMin !== defaults.rvolMin) {
    chips.push({
      id: 'rvolMin',
      label: `RVOL ≥ ${rvolMin.toFixed(1)}`,
      ariaLabel: 'Remove Relative Volume minimum filter',
      clearValue: defaults.rvolMin,
    });
  }

  // catalyst
  if (values.catalyst !== defaults.catalyst && values.catalyst) {
    chips.push({
      id: 'catalyst',
      label: 'Catalyst',
      ariaLabel: 'Remove Catalyst filter',
      clearValue: defaults.catalyst,
    });
  }

  return chips;
}
