import { useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchTickerMetrics } from './client';
import type { TickerMetrics, TickerRow } from '../../lib/types';
import { Card, Row, Col, Spinner, Alert, Badge, Button, Stack } from 'react-bootstrap';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { useWatchlist } from '../watchlists/useWatchlist';
import { computeSqueezeScore, computeSqueezeScoreFromMetrics } from './squeezeScore';
import { formatScore } from './format';
import { TICKERS_QUERY_KEY } from './query';

function hasMetrics(x: unknown): x is TickerMetrics {
  if (!x || typeof x !== 'object') return false;
  const m = x as Record<string, unknown>;
  return (
    typeof m.ticker === 'string' &&
    typeof m.siPublic === 'number' &&
    typeof m.siBroad === 'number' &&
    typeof m.dtc === 'number' &&
    typeof m.rvol30d === 'number' &&
    Array.isArray(m.series)
  );
}

export default function TickerDetailPage() {
  const { symbol = '' } = useParams();

  // Hooks must run unconditionally on every render
  const { list, add, remove } = useWatchlist();
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ['ticker', symbol],
    queryFn: () => fetchTickerMetrics(symbol),
    enabled: Boolean(symbol),
    retry: false,
  });

  if (!symbol) {
    return <Alert variant="warning">No symbol provided.</Alert>;
  }

  if (isLoading) {
    return <Spinner animation="border" role="status" aria-label="Loading…" />;
  }

  if (error || !hasMetrics(data)) {
    return (
      <Alert variant="secondary">
        No data found for <strong>{symbol}</strong>.
      </Alert>
    );
  }

  const m = data;

  // Derive latest price from the series if present
  const lastPrice =
    Array.isArray(m.series) &&
      m.series.length > 0 &&
      typeof m.series[m.series.length - 1]?.price === 'number'
      ? (m.series[m.series.length - 1].price as number)
      : undefined;

  // Try to reuse the screener row for a consistent SqueezeScore; fall back to metrics.
  const tickers = queryClient.getQueryData<TickerRow[]>(TICKERS_QUERY_KEY) ?? [];
  const rowForSymbol = tickers.find((row) => row.ticker === m.ticker);
  const squeezeScore = rowForSymbol
    ? computeSqueezeScore(rowForSymbol)
    : computeSqueezeScoreFromMetrics(m);

  const saved = Array.isArray(list) ? list.includes(m.ticker) : false;
  const toggleWatch = () => (saved ? remove(m.ticker) : add(m.ticker));

  return (
    <section className="container py-4" aria-labelledby="ticker-heading">
      {/* Hero strip: ticker + key facts + watch toggle */}
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-3">
        <Stack direction="horizontal" gap={3} className="flex-wrap">
          <h2 id="ticker-heading" className="mb-0">
            {m.ticker}
          </h2>

          {typeof lastPrice === 'number' && (
            <div className="text-secondary">${lastPrice.toFixed(2)}</div>
          )}

          <Badge
            bg="dark"
            className="border"
            title="Computed SqueezeScore (0–100) using screener formula"
          >
            SqueezeScore:{' '}
            <span className="ms-1 fw-semibold">{formatScore(squeezeScore)}</span>
          </Badge>

          <Badge bg="secondary" title="30-day relative volume">
            RVOL(30d): <span className="ms-1 fw-semibold">{m.rvol30d.toFixed(1)}</span>
          </Badge>
        </Stack>

        <div className="d-flex gap-2 mt-2 mt-md-0">
          <Button
            size="sm"
            variant={saved ? 'outline-danger' : 'primary'}
            onClick={toggleWatch}
            aria-label={
              saved ? `Remove ${m.ticker} from watchlist` : `Add ${m.ticker} to watchlist`
            }
          >
            {saved ? 'Remove from Watchlist' : 'Add to Watchlist'}
          </Button>
        </div>
      </div>

      <Row className="g-3 mb-3">
        <Col md>
          <Card body>SI% Public: {m.siPublic.toFixed(1)}</Card>
        </Col>
        <Col md>
          <Card body>SI% Broad: {m.siBroad.toFixed(1)}</Card>
        </Col>
        <Col md>
          <Card body>DTC: {m.dtc.toFixed(1)}</Card>
        </Col>
        <Col md>
          <Card body>RVOL(30d): {m.rvol30d.toFixed(1)}</Card>
        </Col>
        <Col md>
          <Card body>SqueezeScore: {formatScore(squeezeScore)}</Card>
        </Col>
      </Row>

      <Card body>
        <div style={{ width: '100%', height: 300 }}>
          <ResponsiveContainer>
            <LineChart data={m.series}>
              <XAxis dataKey="t" hide />
              <YAxis domain={['auto', 'auto']} />
              <Tooltip />
              <Line type="monotone" dataKey="price" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </section>
  );
}
