import * as React from 'react';
import type { ActiveFilterChip, ActiveFilterId } from '../utils/activeFilters';

type Props = {
  chips: ActiveFilterChip[];
  onRemove: (id: ActiveFilterId) => void;
  onClearAll: () => void;
};

export default function ActiveFilterChips({ chips, onRemove, onClearAll }: Props) {
  if (chips.length === 0) return null;

  return (
    <div className="d-flex flex-wrap align-items-center gap-2 mb-3">
      <ul className="list-unstyled d-flex flex-wrap gap-2 mb-0">
        {chips.map((chip) => (
          <li key={chip.id}>
            <button
              type="button"
              className="btn btn-sm border rounded-pill px-2 py-1 d-inline-flex align-items-center gap-2 text-body"
              style={{ backgroundColor: 'rgba(13,110,253,0.08)' }} // Bootstrap primary tint
              onClick={() => onRemove(chip.id)}
              aria-label={chip.ariaLabel}
            >
              <span className="small">{chip.label}</span>
              <span aria-hidden="true" className="fw-semibold text-body-secondary">
                ×
              </span>
            </button>
          </li>
        ))}
      </ul>

      <button
        type="button"
        className="btn btn-link btn-sm ms-auto text-decoration-none px-1"
        onClick={onClearAll}
        aria-label="Clear all filters"
      >
        Clear all
      </button>
    </div>
  );
}
