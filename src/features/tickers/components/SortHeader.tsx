import { Button } from 'react-bootstrap';
import type { TickerRow } from '../../../lib/types';

export type SortDir = 'asc' | 'desc';
export type sortableColumn = keyof TickerRow | 'pctChange';

type Props = {
  label: string;
  col: sortableColumn;
  activeSort: sortableColumn;
  dir: SortDir;
  onSort: (col: sortableColumn) => void;
};

export function SortHeader({ label, col, activeSort, dir, onSort }: Props) {
  const isActive = activeSort === col; // isActive = true if activeSort and col are identical
  const caret = dir === 'asc' ? '▲' : '▼';

  return (
    <Button
      variant="link"
      size="sm"
      className="sort-header-btn w-100 text-start"
      onClick={() => onSort(col)}
      title={isActive ? `Sorted by ${label}  (${dir})` : `Sort by ${label}`}
      aria-label={
        isActive ? `Sort by ${label}, currently ${dir}. Toggle direction.` : `Sort by ${label}`
      }
      data-active={isActive ? 'true' : 'false'}
    >
      <span className="sort-header-inner">
        <span className="sort-header-label">{label}</span>
        {/* caret placeholder is ALWAYS rendered to reserve space */}
        <span className="sort-caret" aria-hidden="true">{caret}</span>
      </span>
    </Button>
  );
}
