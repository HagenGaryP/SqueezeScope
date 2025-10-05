import * as React from 'react';
import { Link } from 'react-router-dom';
import { Table, Button, Badge, Spinner, Alert } from 'react-bootstrap';
import { useQuery } from '@tanstack/react-query';
import { useWatchlist } from './useWatchlist';
import { api } from '../../lib/api';
import type { TickerRow } from '../../lib/types';

export default function WatchlistPage() {
  const { list, remove } = useWatchlist();
  const tickers = React.useMemo(() => new Set<string>(Array.isArray(list) ? list : []), [list]);

  const { data, isLoading, error } = useQuery<TickerRow[] | { rows: TickerRow[] }>({
    queryKey: ['tickers'],
    queryFn: async () => (await api.get<TickerRow[]>('/tickers')).data,
  });

  const allRows: TickerRow[] = Array.isArray(data) ? data : Array.isArray(data?.rows) ? data.rows : [];
  const rows = allRows.filter(r => tickers.has(r.ticker));

  if (isLoading) {
    return (
      <div className="d-flex justify-content-center py-5">
        <Spinner animation="border" role="status" aria-label="Loading watchlist…" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="danger" className="my-3">
        Failed to load data. Try reloading.
      </Alert>
    );
  }

  if (rows.length === 0) {
    return (
      <section className="container py-4" aria-labelledby="watchlist-heading">
        <h2 id="watchlist-heading" className="mb-3">Watchlist</h2>
        <Alert variant="secondary" className="d-flex justify-content-between align-items-center">
          <span>Your watchlist is empty.</span>
          <Link to="/screener" className="btn btn-primary btn-sm">Go to Screener</Link>
        </Alert>
      </section>
    );
  }

  return (
    <section className="container py-4" aria-labelledby="watchlist-heading">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h2 id="watchlist-heading" className="mb-0">Watchlist</h2>
        <Badge bg="secondary" pill aria-label={`${rows.length} saved tickers`}>{rows.length}</Badge>
      </div>

      <Table
        className="table-sticky ss-compact ss-lines ss-hover"
        variant="dark"
        size="sm"
        responsive
        striped
      >
        <thead>
          <tr>
            <th scope="col" className="text-start">Ticker</th>
            <th scope="col" className="text-start">Price</th>
            <th scope="col" className="text-start">% Change</th>
            <th scope="col" className="text-start">SI% Public</th>
            <th scope="col" className="text-start">RVOL</th>
            <th scope="col" className="text-start col-fit">Catalyst</th>
            <th scope="col" className="text-start col-fit">Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(r => (
            <tr key={r.ticker}>
              <td>
                <Link to={`/ticker/${r.ticker}`} className="fw-semibold ss-ticker-link text-start">
                  {r.ticker}
                </Link>
              </td>
              <td className="text-start">{r.price?.toFixed?.(2) ?? '—'}</td>
              <td className={`text-start ${Number(r.pctChange) >= 0 ? 'text-success' : 'text-danger'}`}>
                {typeof r.pctChange === 'number' ? r.pctChange.toFixed(2) : '—'}
              </td>
              <td className="text-start">{r.siPublic ?? '—'}</td>
              <td className="text-start">{r.rvol ?? '—'}</td>

              <td className="text-start col-fit">
                {r.catalyst ? <Badge bg="info" className="text-dark">Catalyst</Badge> : '—'}
              </td>

              <td className="text-start col-fit">
                <Button
                  variant="outline-danger"
                  size="sm"
                  onClick={() => remove(r.ticker)}
                  aria-label={`Remove ${r.ticker} from watchlist`}
                >
                  Remove
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
    </section>
  );
};
