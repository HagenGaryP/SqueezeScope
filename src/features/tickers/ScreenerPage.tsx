import * as React from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, Row, Col, Spinner, Button, Alert } from 'react-bootstrap';

import { api } from '../../lib/api';
import type { TickerRow } from '../../lib/types';
import ScreenerTable from './components/ScreenerTable';
import {
  ScreenerInputSchema,
  ScreenerFormSchema,
  type ScreenerValues,
  type SortKey,
  type Dir,
} from './screenerSchema';
import { filterRows } from './filter';
import { sortRows, type SortKey as SortKeyForSort } from './sort';

function valuesFromParams(params: URLSearchParams): ScreenerValues {
  const raw = {
    q: params.get('q') ?? '',
    siMin: params.get('siMin') ?? '0',
    dtcMin: params.get('dtcMin') ?? '0',
    rvolMin: params.get('rvolMin') ?? '0',
    catalyst: params.get('catalyst') === '1' ? 'true' : 'false',
    sort: (params.get('sort') ?? 'ticker') as SortKey,
    dir: (params.get('dir') ?? 'asc') as Dir,
  };
  const coerced = ScreenerInputSchema.parse(raw);
  return ScreenerFormSchema.parse(coerced);
}

// helper function for ScreenerPage component - Normalizes query result into plain array of rows.
function toTickerRows(input: TickerRow[] | { rows: TickerRow[] } | undefined): TickerRow[] {
  if (!input) return [];
  return Array.isArray(input) ? input : input.rows;
}

export default function ScreenerPage() {
  // data
  const { data, isLoading, error } = useQuery<TickerRow[] | { rows: TickerRow[] }>({
    queryKey: ['tickers'],
    queryFn: async () => (await api.get<TickerRow[]>('/tickers')).data,
  });

  // URL <-> form
  const [params, setParams] = useSearchParams();
  const form = useForm<ScreenerValues>({
    defaultValues: valuesFromParams(params),
    resolver: zodResolver(ScreenerFormSchema),
    mode: 'onChange',
  });

  React.useEffect(() => {
    const sub = form.watch((values) => {
      const v = values as ScreenerValues;
      const next = new URLSearchParams();
      if (v.q) next.set('q', v.q);
      if (v.siMin) next.set('siMin', String(v.siMin));
      if (v.dtcMin) next.set('dtcMin', String(v.dtcMin));
      if (v.rvolMin) next.set('rvolMin', String(v.rvolMin));
      if (v.catalyst) next.set('catalyst', '1');
      next.set('sort', v.sort);
      next.set('dir', v.dir);
      setParams(next, { replace: true });
    });
    return () => sub.unsubscribe();
  }, [form, setParams]);

  const onSort = React.useCallback((col: SortKey) => {
    const cur = form.getValues();
    if (col === cur.sort) {
      form.setValue('dir', cur.dir === 'asc' ? 'desc' : 'asc');
    } else {
      form.setValue('sort', col);
      form.setValue('dir', 'asc');
    }
  }, [form]);

  // derived table data (filter + sort via pure helpers)
const watched = form.watch();

const tableRows = React.useMemo(() => {
  const base = toTickerRows(data);
  const obj = {
    q: watched.q,
    siMin: watched.siMin,
    dtcMin: watched.dtcMin,
    rvolMin: watched.rvolMin,
    catalyst: watched.catalyst,
  };
  const filtered = filterRows(base, obj);

  return sortRows(filtered, watched.sort as SortKeyForSort, watched.dir);
}, [data, watched]);

  // UI states
  if (isLoading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: 240 }}>
        <Spinner role="status" aria-label="Loading tickers…" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="danger" className="mt-3" role="alert">
        Failed to load tickers. Please retry.
      </Alert>
    );
  }

  return (
    <section aria-labelledby="screener-heading">
      <h2 id="screener-heading" className="mb-3">Screener</h2>

      <Form className="mb-3" noValidate onSubmit={(e) => e.preventDefault()}>
        <Row className="g-2 align-items-end">
          <Form.Group as={Col} md={3} controlId="q">
            <Form.Label>Search</Form.Label>
            <Form.Control
              placeholder="Ticker…"
              inputMode="search"
              autoCapitalize="characters"
              {...form.register('q')}
            />
          </Form.Group>

          <Form.Group as={Col} md={2} controlId="siMin">
            <Form.Label>SI% (min)</Form.Label>
            <Form.Control
              type="number"
              step={1}
              min={0}
              max={100}
              {...form.register('siMin', { valueAsNumber: true })}
            />
          </Form.Group>

          <Form.Group as={Col} md={2} controlId="dtcMin">
            <Form.Label>DTC (min)</Form.Label>
            <Form.Control
              type="number"
              step={0.1}
              min={0}
              max={10}
              {...form.register('dtcMin', { valueAsNumber: true })}
            />
          </Form.Group>

          <Form.Group as={Col} md={2} controlId="rvolMin">
            <Form.Label>RVOL (min)</Form.Label>
            <Form.Control
              type="number"
              step={0.1}
              min={0}
              max={10}
              {...form.register('rvolMin', { valueAsNumber: true })}
            />
          </Form.Group>

          <Form.Group as={Col} md={1} controlId="catalyst">
            <Form.Check
              type="checkbox"
              label="Catalyst"
              {...form.register('catalyst')}
            />
          </Form.Group>

          <Form.Group as={Col} md={2} controlId="sort">
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
          </Form.Group>

          <Col md="auto">
            <Form.Label>Sort Direction</Form.Label>
            <div>
              <Button
                type="button"
                variant={watched.dir === 'asc' ? 'primary' : 'secondary'}
                size="sm"
                className="me-2"
                onClick={() => form.setValue('dir', 'asc')}
                aria-pressed={watched.dir === 'asc'}
              >
                Asc
              </Button>
              <Button
                type="button"
                variant={watched.dir === 'desc' ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => form.setValue('dir', 'desc')}
                aria-pressed={watched.dir === 'desc'}
              >
                Desc
              </Button>
            </div>
          </Col>
        </Row>
      </Form>

      <ScreenerTable
        rows={tableRows}
        activeSort={watched.sort}
        dir={watched.dir}
        onSort={onSort}
      />
    </section>
  );
}
