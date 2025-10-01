import { Table, Badge, Button } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import type { TickerRow } from '../../../lib/types';
import { useWatchlist } from '../../watchlists/useWatchlist';
import { SortHeader } from './SortHeader';

// sort types
type SortDir = 'asc' | 'desc';
type SortableColumn = keyof TickerRow | 'pctChange';

type Props = {
  rows: TickerRow[];
  activeSort: SortableColumn;
  dir: SortDir;
  onSort: (col: SortableColumn) => void;
};

export default function ScreenerTable({ rows, activeSort, dir, onSort }: Props) {

  const { add, remove, has } = useWatchlist();

  const columns: Array<{ label: string; col: SortableColumn }> = [
    { label: 'Ticker', col: 'ticker' },
    { label: 'Price', col: 'price' },
    { label: '% Change', col: 'pctChange' },
    { label: 'SI% (Public)', col: 'siPublic' },
    { label: 'SI% (Broad)', col: 'siBroad' },
    { label: 'DTC', col: 'dtc' },
    { label: 'RVOL', col: 'rvol' },
  ];

  return (
    <Table className="table-sticky" striped bordered hover variant="dark" size="sm" responsive>
      <thead>
        <tr>
          {columns.map(({ label, col }) => (
            <th
              key={col}
              aria-sort={activeSort === col ? (dir === 'asc' ? 'ascending' : 'descending') : 'none'}
            >
              <SortHeader label={label} col={col} activeSort={activeSort} dir={dir} onSort={onSort} />
            </th>
          ))}

          {/* Not sorting by Catalyst or Watch */}
          <th>Catalyst</th>
          <th>Watch</th>
        </tr>
      </thead>
      <tbody>
        {rows.map(r => {

          const tracked = has(r.ticker);

          return (
            <tr key={r.ticker}>
              <td><Link to={`/ticker/${r.ticker}`}>{r.ticker}</Link></td>
              <td>{r.price.toFixed(2)}</td>
              <td className={r.pctChange >= 0 ? 'text-success' : 'text-danger'}>
                {r.pctChange.toFixed(2)}
              </td>
              <td>{r.siPublic.toFixed(1)}</td>
              <td>{r.siBroad.toFixed(1)}</td>
              <td>{r.dtc.toFixed(1)}</td>
              <td>{r.rvol.toFixed(1)}</td>
              <td>{r.catalyst ? <Badge bg="warning" text="dark">Yes</Badge> : '—'}</td>
              <td className="text-nowrap">
                {tracked ? (
                  <Button size="sm" variant="outline-warning" onClick={() => remove(r.ticker)}>
                    Remove
                  </Button>
                ) : (
                  <Button size="sm" variant="outline-info" onClick={() => add(r.ticker)}>
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
