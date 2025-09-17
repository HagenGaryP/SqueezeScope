import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api } from '../../lib/api'
import type { TickerMetrics } from '../../lib/types'
import { Card, Row, Col, Spinner, Alert } from 'react-bootstrap'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

function hasMetrics(x: unknown): x is TickerMetrics {
  if (!x || typeof x !== 'object') return false
  const m = x as Record<string, unknown>
  return (
    typeof m.ticker === 'string' &&
    typeof m.siPublic === 'number' &&
    typeof m.siBroad === 'number' &&
    typeof m.dtc === 'number' &&
    typeof m.rvol30d === 'number' &&
    typeof m.squeezeScore === 'number' &&
    Array.isArray(m.series)
  )
}

export default function TickerDetailPage() {
  const { symbol = '' } = useParams()

  const { data, isLoading, error } = useQuery({
    queryKey: ['ticker', symbol],
    queryFn: async () => {
      const res = await api.get<TickerMetrics>(`/tickers/${symbol}`)
      return res.data
    },
    enabled: Boolean(symbol),
    retry: false,
  })

  if (!symbol) return <Alert variant="warning">No symbol provided.</Alert>
  if (isLoading) return <Spinner animation="border" />
  if (error || !hasMetrics(data)) {
    return <Alert variant="secondary">No data found for <strong>{symbol}</strong>.</Alert>
  }

  const m = data

  return (
    <div>
      <h2 className="mb-3">{m.ticker}</h2>

      <Row className="g-3 mb-3">
        <Col md><Card body>SI% Public: {m.siPublic.toFixed(1)}</Card></Col>
        <Col md><Card body>SI% Broad: {m.siBroad.toFixed(1)}</Card></Col>
        <Col md><Card body>DTC: {m.dtc.toFixed(1)}</Card></Col>
        <Col md><Card body>RVOL(30d): {m.rvol30d.toFixed(1)}</Card></Col>
        <Col md><Card body>Squeeze Score: {m.squeezeScore}</Card></Col>
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
    </div>
  )
}
