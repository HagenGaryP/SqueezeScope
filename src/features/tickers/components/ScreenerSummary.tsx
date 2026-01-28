import * as React from 'react';
import type { Dir, SortKey } from '../screenerSchema';

const SORT_LABELS: Record<SortKey, string> = {
  ticker: 'Ticker',
  siPublic: 'SI% Public',
  siBroad: 'SI% Broad',
  rvol: 'RVOL',
  dtc: 'DTC',
  squeezeScore: 'Squeeze Score',
  pctChange: '% Change',
  price: 'Price',
};

type Props = {
  shownCount: number;
  totalCount: number;
  sort: SortKey;
  dir: Dir;
  activeFilterCount: number;
  isUpdating?: boolean;
};

export default function ScreenerSummary({
  shownCount,
  totalCount,
  sort,
  dir,
  activeFilterCount,
  isUpdating = false,
}: Props) {
  const sortLabel = SORT_LABELS[sort] ?? String(sort);
  const dirLabel = dir === 'asc' ? 'Asc' : 'Desc';

  return (
    <div className="d-flex flex-wrap align-items-center justify-content-between py-2">
      <div className="d-flex flex-wrap align-items-center gap-3">
        <span className="text-body">
          <strong>
            Showing {shownCount}
            {Number.isFinite(totalCount) && totalCount > 0 ? ` of ${totalCount}` : ''}
          </strong>{' '}
          <span className="text-body-secondary">tickers</span>
        </span>

        <span className="text-body-secondary">
          Sort: <span className="text-body">{sortLabel}</span> ({dirLabel})
        </span>

        {activeFilterCount > 0 ? (
          <span className="text-body-secondary">
            {activeFilterCount} filter{activeFilterCount === 1 ? '' : 's'} active
          </span>
        ) : (
          <span className="text-body-secondary">No active filters</span>
        )}
      </div>

      {isUpdating ? (
        <span className="text-body-secondary d-inline-flex align-items-center gap-2">
          <span className="spinner-border spinner-border-sm" aria-hidden="true" />
          <span>Updating</span>
        </span>
      ) : null}
    </div>
  );
}
