import * as React from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Form, Row, Col, Spinner, Button } from 'react-bootstrap'

import { api } from '../../lib/api'
import type { TickerRow } from '../../lib/types'
import ScreenerTable from './components/ScreenerTable'
import {
  ScreenerInputSchema,
  ScreenerFormSchema,
  type ScreenerValues,
  type SortKey,
  type Dir,
} from './screenerSchema'

function sortKeyToField(k: SortKey): keyof TickerRow {
  switch (k) {
    case 'siPublic': return 'siPublic';
    case 'siBroad': return 'siBroad';
    case 'dtc': return 'dtc';
    case 'rvol': return 'rvol';
    case 'pctChange': return 'pctChange';
    case 'price': return 'price';
    case 'ticker':
    default: return 'ticker';
  }
}

function valuesFromParams(params: URLSearchParams): ScreenerValues {
  const raw = {
    q: params.get('q') ?? '',
    siMin: params.get('siMin') ?? '0',
    dtcMin: params.get('dtcMin') ?? '0',
    rvolMin: params.get('rvolMin') ?? '0',
    catalyst: params.get('catalyst') === '1' ? 'true' : 'false',
    sort: (params.get('sort') ?? 'ticker') as SortKey,
    dir: (params.get('dir') ?? 'asc') as Dir,
  }
  // 1) Coerce & default from URL
  const coerced = ScreenerInputSchema.parse(raw)
  // 2) Enforce “required” shape for the form
  return ScreenerFormSchema.parse(coerced)
}

export default function ScreenerPage() {
  // --- data ---
  const { data, isLoading, error } = useQuery<TickerRow[] | { rows: TickerRow[] }>({
    queryKey: ['tickers'],
    queryFn: async () => (await api.get<TickerRow[]>('/tickers')).data,
  });

  // --- URL <-> form state (single source of truth for sorting/filtering) ---
  const [params, setParams] = useSearchParams()
  const form = useForm<ScreenerValues>({
    defaultValues: valuesFromParams(params),
    resolver: zodResolver(ScreenerFormSchema), // <-- uses the required schema
    mode: 'onChange',
  });

  // Reflect form changes into URL
  React.useEffect(() => {
    const sub = form.watch((values) => {
      const v = values as ScreenerValues
      const next = new URLSearchParams()
      if (v.q) next.set('q', v.q)
      if (v.siMin) next.set('siMin', String(v.siMin))
      if (v.dtcMin) next.set('dtcMin', String(v.dtcMin))
      if (v.rvolMin) next.set('rvolMin', String(v.rvolMin))
      if (v.catalyst) next.set('catalyst', '1')
      next.set('sort', v.sort)
      next.set('dir', v.dir)
      setParams(next, { replace: true })
    })
    return () => sub.unsubscribe()
  }, [form, setParams])

  // onSort handler - updates the form
  const onSort = React.useCallback((col: SortKey) => {
    const cur = form.getValues();
    if (col === cur.sort) {
      form.setValue('dir', cur.dir === 'asc' ? 'desc' : 'asc');
    } else {
      form.setValue('sort', col);
      form.setValue('dir', 'asc');
    }
  }, [form]);

  // --- derived table data (filter + sort) ---
  const watched = form.watch()
  const filtered = React.useMemo(() => {
    const rows: TickerRow[] = Array.isArray(data)
      ? data
      : Array.isArray(data?.rows)
        ? data?.rows
        : [];

    const { q, siMin, dtcMin, rvolMin, catalyst, sort, dir } = watched;

    let out = rows
      .filter(r => !q || r.ticker.toLowerCase().includes(q.toLowerCase()))
      .filter(r => r.siPublic >= siMin)
      .filter(r => r.dtc >= dtcMin)
      .filter(r => r.rvol >= rvolMin)
      .filter(r => !catalyst || r.catalyst);

    const key: keyof TickerRow = sortKeyToField(sort);
    const order = dir === 'asc' ? 1 : -1;

    out = [...out].sort((a, b) => {
      const av = a[key]; // number | string
      const bv = b[key]; // number | string
      if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * order;
      return String(av).localeCompare(String(bv)) * order;
    });

    return out;
  }, [data, watched])

  // --- UI ---
  if (isLoading) return <Spinner animation="border" />;
  if (error) return <p>Failed to load.</p>;

  return (
    <div>
      <h2 className="mb-3">Screener</h2>

      <Form className="mb-3" onSubmit={(e) => e.preventDefault()}>
        <Row className="g-2 align-items-end">
          <Col md={3}>
            <Form.Label>Search</Form.Label>
            <Form.Control
              placeholder="Ticker…"
              {...form.register('q')}
              inputMode="search"
              autoCapitalize="characters"
            />
          </Col>
          <Col md={2}>
            <Form.Label>SI% (min)</Form.Label>
            <Form.Control type="number" step="1" min="0" max="100" {...form.register('siMin', { valueAsNumber: true })} />
          </Col>
          <Col md={2}>
            <Form.Label>DTC (min)</Form.Label>
            <Form.Control type="number" step="0.1" min="0" max="10" {...form.register('dtcMin', { valueAsNumber: true })} />
          </Col>
          <Col md={2}>
            <Form.Label>RVOL (min)</Form.Label>
            <Form.Control type="number" step="0.1" min="0" max="10" {...form.register('rvolMin', { valueAsNumber: true })} />
          </Col>
          <Col md={1}>
            <Form.Check type="checkbox" label="Catalyst" {...form.register('catalyst')} />
          </Col>
          <Col md={2}>
            <Form.Label>Sort</Form.Label>
            <Form.Select {...form.register('sort')}>
              <option value="ticker">Ticker</option>
              <option value="siPublic">SI% Public</option>
              <option value="siBroad">SI% Broad</option>
              <option value="rvol">RVOL</option>
              <option value="dtc">DTC</option>
              <option value="pctChange">% Change</option>
              <option value="price">Price</option>
            </Form.Select>
          </Col>
          <Col md="auto">
            <Form.Label>Sort Direction</Form.Label>
            <div>
              <Button
                variant={watched.dir === 'asc' ? 'primary' : 'secondary'}
                size="sm"
                className="me-2"
                onClick={() => form.setValue('dir', 'asc')}
              >Asc</Button>
              <Button
                variant={watched.dir === 'desc' ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => form.setValue('dir', 'desc')}
              >Desc</Button>
            </div>
          </Col>
        </Row>
      </Form>

      <ScreenerTable
        rows={filtered}
        activeSort={watched.sort}
        dir={watched.dir}
        onSort={onSort}
      />
    </div>
  )
}
