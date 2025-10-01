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
      className="p-0 text-decoration-none text-light sort-header-btn"
      onClick={() => onSort(col)}
      title={isActive ? `Sorted by ${label}  (${dir})` : `Sort by ${label}`}
      aria-label={
        isActive ? `Sort by ${label}, currently ${dir}. Toggle direction.` : `Sort by ${label}`
      }
    >
      {label}{' '}
      {/* show caret only on active column */}
      {isActive ? <span aria-hidden="true">{caret}</span> : null}
    </Button>
  );
}
