import { Table, Badge } from 'react-bootstrap'
import { Link } from 'react-router-dom'
import type { TickerRow } from '../../../lib/types'

export default function ScreenerTable({ rows }: { rows: TickerRow[] }) {
  return (
    <Table striped bordered hover variant="dark" size="sm" responsive>
      <thead>
        <tr>
          <th>Ticker</th><th>Price</th><th>%</th>
          <th>SI% (Public)</th><th>SI% (Broad)</th><th>DTC</th><th>RVOL</th><th>Catalyst</th>
        </tr>
      </thead>
      <tbody>
        {rows.map(r => (
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
          </tr>
        ))}
      </tbody>
    </Table>
  )
}
