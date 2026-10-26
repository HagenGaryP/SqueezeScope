import { SORT_LABELS, type Dir, type SortKey } from '../screenerSchema';

type Props = {
  shown: number;
  total: number;
  sort: SortKey;
  dir: Dir;
  activeFilterCount: number;
};

/** One-line feedback strip: result count, current sort and number of active filters. */
export default function ScreenerSummary({ shown, total, sort, dir, activeFilterCount }: Props) {
  const filters =
    activeFilterCount > 0
      ? ` · ${activeFilterCount} ${activeFilterCount === 1 ? 'filter' : 'filters'} active`
      : '';

  return (
    <p className="ss-summary small mb-2" role="status">
      Showing {shown} of {total} tickers · Sorted by {SORT_LABELS[sort]},{' '}
      {dir === 'asc' ? 'ascending' : 'descending'}
      {filters}
    </p>
  );
}
