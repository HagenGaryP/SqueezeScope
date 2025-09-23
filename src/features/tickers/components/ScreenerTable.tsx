import { Table, Badge, Button } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import type { TickerRow } from '../../../lib/types';
import { useWatchlist } from '../../watchlists/useWatchlist';

export default function ScreenerTable({ rows }: { rows: TickerRow[] }) {

  const { add, remove, has } = useWatchlist();

  return (
    <Table striped bordered hover variant="dark" size="sm" responsive>
      <thead>
        <tr>
          <th>Ticker</th>
          <th>Price</th>
          <th>%</th>
          <th>SI% (Public)</th>
          <th>SI% (Broad)</th>
          <th>DTC</th>
          <th>RVOL</th>
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
              <td>
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
