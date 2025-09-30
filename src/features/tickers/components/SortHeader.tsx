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
  const caret = isActive ? (dir === 'asc' ? '▲' : '▼') : '▵';

  return (
    <Button
      variant="link"
      size="sm"
      className="p-0 text-decoration-none text-light"
      onClick={() => onSort(col)}
      aria-label={`Sort by ${label}${isActive ? `, ${dir}` : ''}`}
    >
      {label} <span aria-hidden="true">{caret}</span>
    </Button>
  );
}
