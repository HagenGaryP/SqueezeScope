import { Table, Badge, Button } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import type { TickerRow } from '../../../lib/types';
import { useWatchlist } from '../../watchlists/useWatchlist';
import { SortHeader } from './SortHeader';
import type { SortKey } from '../screenerSchema';
import {
  formatPrice,
  formatPercentChange,
  formatPercent1,
  formatOneDecimal,
} from '../format';


/**
 * Local sort types mirroring the page.
 */
type SortDir = 'asc' | 'desc';

/**
 * Table props:
 * - rows:     already filtered/sorted data for display
 * - activeSort/dir: current sort state (drives header UI and aria-sort)
 * - onSort:   invoked by SortHeader to update the sort state upstream
 */
type Props = {
  rows: TickerRow[];
  activeSort: SortKey;
  dir: SortDir;
  onSort: (col: SortKey) => void;
};

/**
 * DRY config for sortable headers. Hoisted outside the component
 * to avoid re-allocating the array on every render.
 */
const COLUMNS: ReadonlyArray<{ label: string; col: SortKey }> = [
  { label: 'Ticker', col: 'ticker' },
  { label: 'Price', col: 'price' },
  { label: '% Change', col: 'pctChange' },
  { label: 'SI% (Public)', col: 'siPublic' },
  { label: 'SI% (Broad)', col: 'siBroad' },
  { label: 'DTC', col: 'dtc' },
  { label: 'RVOL', col: 'rvol' },
];

export default function ScreenerTable({ rows, activeSort, dir, onSort }: Props) {
  const { add, remove, has } = useWatchlist();

  return (
    <Table
      className="table-sticky ss-compact ss-lines ss-hover"
      striped
      hover
      variant="dark"
      size="sm"
      responsive
    >
      <thead>
        <tr>
          {/* Sortable columns: render from config to keep markup consistent and maintainable.
              aria-sort communicates the current sort state to assistive tech. */}
          {COLUMNS.map(({ label, col }) => (
            <th
              key={col}
              aria-sort={activeSort === col ? (dir === 'asc' ? 'ascending' : 'descending') : 'none'}
              data-sort-active={activeSort === col ? 'true' : 'false'}
            >
              <SortHeader
                label={label}
                col={col}
                activeSort={activeSort}
                dir={dir}
                onSort={onSort}
              />
            </th>
          ))}

          {/* Non-sortable columns: Catalyst flag and Watchlist actions */}
          <th>Catalyst</th>
          <th>Watch</th>
        </tr>
      </thead>
      <tbody>
        {/* Note: rows are assumed normalized and typed upstream.
            Keep row rendering straightforward and side-effect free. */}
        {rows.map(r => {
          const tracked = has(r.ticker);

          return (
            <tr key={r.ticker}>
              <td>
                {/* Link to detail page; keep the symbol as-is (already uppercased upstream). */}
                <Link to={`/ticker/${r.ticker}`}>{r.ticker}</Link>
              </td>

              {/* Number cells: use toFixed for consistent decimals in the current UX.
                  (If needed later, switch to Intl.NumberFormat for locale-aware formatting.) */}
              <td>{formatPrice(r.price)}</td>

              <td className={r.pctChange >= 0 ? 'text-success' : 'text-danger'}>
                {formatPercentChange(r.pctChange)}
              </td>

              <td>{formatPercent1(r.siPublic)}</td>
              <td>{formatPercent1(r.siBroad)}</td>
              <td>{formatOneDecimal(r.dtc)}</td>
              <td>{formatOneDecimal(r.rvol)}</td>


              {/* Catalyst: use a badge for quick scanning; fallback em dash when false. */}
              <td>{r.catalyst ? <Badge bg="warning" text="dark">Yes</Badge> : '—'}</td>

              {/* Watchlist action: compact buttons; keep layout stable with text-nowrap. */}
              <td className="text-nowrap">
                {tracked ? (
                  <Button
                    size="sm"
                    variant="outline-warning"
                    onClick={() => remove(r.ticker)}
                    aria-label={`Remove ${r.ticker} from watchlist`}
                  >
                    Remove
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="outline-info"
                    onClick={() => add(r.ticker)}
                    aria-label={`Add ${r.ticker} to watchlist`}
                  >
                    Add
                  </Button>
                )}
              </td>
            </tr>
          );
        })}
      </tbody>
    </Table>
  )
}
