import * as React from 'react';
import { Button } from 'react-bootstrap';
import type { ActiveFilter } from '../activeFilters';
import type { FilterKey } from '../screenerSchema';

type Props = {
  filters: ActiveFilter[];
  onRemove: (key: FilterKey) => void;
  onClearAll: () => void;
  /** Called after the last chip is removed so the caller can place focus. */
  onAllRemoved?: () => void;
};

/**
 * Removable chips for the active screener filters, plus "Clear all".
 * Chips are real buttons so they are reachable with Tab and operable with Enter/Space.
 * After a chip is removed, focus moves to the chip that took its place (or the previous one)
 * so keyboard users are not dropped back to the top of the document.
 */
export default function ActiveFilterChips({ filters, onRemove, onClearAll, onAllRemoved }: Props) {
  const chipRefs = React.useRef(new Map<FilterKey, HTMLButtonElement>());
  const pendingFocus = React.useRef<{ index: number; removed: FilterKey } | null>(null);

  React.useEffect(() => {
    const pending = pendingFocus.current;
    // Wait until the removed chip is actually gone before moving focus.
    if (!pending || filters.some((f) => f.key === pending.removed)) return;
    pendingFocus.current = null;
    const next = filters[Math.min(pending.index, filters.length - 1)];
    if (next) chipRefs.current.get(next.key)?.focus();
    else onAllRemoved?.();
  }, [filters, onAllRemoved]);

  if (filters.length === 0) {
    return <p className="ss-filter-chips-empty small mb-0">No active filters</p>;
  }

  return (
    <div className="ss-filter-chips d-flex flex-wrap align-items-center gap-2">
      <ul className="list-unstyled d-flex flex-wrap gap-2 mb-0" aria-label="Active filters">
        {filters.map((f, i) => (
          <li key={f.key}>
            <Button
              ref={(el: HTMLButtonElement | null) => {
                if (el) chipRefs.current.set(f.key, el);
                else chipRefs.current.delete(f.key);
              }}
              type="button"
              size="sm"
              variant="outline-light"
              className="ss-chip rounded-pill"
              aria-label={f.removeLabel}
              onClick={() => {
                pendingFocus.current = { index: i, removed: f.key };
                onRemove(f.key);
              }}
            >
              {f.text}
              <span className="ms-2" aria-hidden="true">×</span>
            </Button>
          </li>
        ))}
      </ul>
      <Button type="button" size="sm" variant="outline-warning" onClick={onClearAll}>
        Clear all
      </Button>
    </div>
  );
}
