import * as React from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, Row, Col, Spinner, Button, Alert } from 'react-bootstrap';

import type { TickerRow } from '../../lib/types';
import ScreenerTable from './components/ScreenerTable';
import ActiveFilterChips from './components/ActiveFilterChips';
import ScreenerSummary from './components/ScreenerSummary';

import {
  ScreenerFormSchema,
  SCREENER_DEFAULTS,
  SORT_LABELS,
  filterKeys,
  sortKeys,
  type FilterKey,
  type ScreenerValues,
  type SortKey,
} from './screenerSchema';

import { filterRows } from './filter';
import { getActiveFilters } from './activeFilters';
import { sortRows, type SortKey as SortKeyForSort } from './sort';
import { valuesFromParams, useScreenerUrlSync } from './urlState';
import { TICKERS_QUERY_KEY } from './query';
import { fetchTickers } from './client';


export default function ScreenerPage() {
  // data
  const { data, isLoading, error } = useQuery<TickerRow[]>({
    queryKey: TICKERS_QUERY_KEY,
    queryFn: fetchTickers,
  });

  // URL <-> form
  const [params, setParams] = useSearchParams();
  const form = useForm<ScreenerValues>({
    defaultValues: valuesFromParams(params),
    resolver: zodResolver(ScreenerFormSchema),
    mode: 'onChange',
  });

  useScreenerUrlSync(form, setParams);

  const onSort = React.useCallback((col: SortKey) => {
    const cur = form.getValues();
    if (col === cur.sort) {
      form.setValue('dir', cur.dir === 'asc' ? 'desc' : 'asc');
    } else {
      form.setValue('sort', col);
      form.setValue('dir', 'asc');
    }
  }, [form]);

  // Chip removal / Clear all go through setValue so the existing watch-based URL sync runs.
  const resetFilter = React.useCallback((key: FilterKey) => {
    form.setValue(key, SCREENER_DEFAULTS[key]);
  }, [form]);

  const clearAllFilters = React.useCallback(() => {
    for (const key of filterKeys) form.setValue(key, SCREENER_DEFAULTS[key]);
    form.setFocus('q');
  }, [form]);

  const focusSearch = React.useCallback(() => form.setFocus('q'), [form]);

  // derived table data (filter + sort via pure helpers)
  const watched = form.watch();

  // form.watch() returns a new object on every call, so depend on the individual
  // values; otherwise the memo misses on every render (including URL-sync renders).
  const { q, siMin, dtcMin, rvolMin, catalyst, sort, dir } = watched;
  const tableRows: TickerRow[] = React.useMemo(() => {
    const filtered = filterRows(data ?? [], { q, siMin, dtcMin, rvolMin, catalyst });
    return sortRows(filtered, sort as SortKeyForSort, dir);
  }, [data, q, siMin, dtcMin, rvolMin, catalyst, sort, dir]);

  const activeFilters = getActiveFilters(watched);

  // The page h1 renders in every state so loading/error views keep a heading.
  const heading = <h1 id="screener-heading" className="h2 mb-3">Screener</h1>;

  // UI states
  if (isLoading) {
    return (
      <section aria-labelledby="screener-heading">
        {heading}
        <div className="d-flex justify-content-center align-items-center" style={{ minHeight: 240 }}>
          <Spinner role="status" aria-label="Loading tickers…" />
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section aria-labelledby="screener-heading">
        {heading}
        <Alert variant="danger" className="mt-3" role="alert">
          Failed to load tickers. Please retry.
        </Alert>
      </section>
    );
  }

  return (
    <section aria-labelledby="screener-heading">
      {heading}

      <Form className="ss-toolbar mb-2" noValidate onSubmit={(e) => e.preventDefault()}>
        <Row className="g-2 align-items-end">
          <Form.Group as={Col} xs={12} sm={6} lg={3} controlId="q">
            <Form.Label className="small mb-1">Search</Form.Label>
            <Form.Control
              size="sm"
              placeholder="Ticker…"
              inputMode="search"
              autoCapitalize="characters"
              {...form.register('q')}
            />
          </Form.Group>

          <Form.Group as={Col} xs={4} sm={2} lg={1} controlId="siMin">
            <Form.Label className="small mb-1">SI% (min)</Form.Label>
            <Form.Control
              size="sm"
              type="number"
              step={1}
              min={0}
              max={100}
              {...form.register('siMin', { valueAsNumber: true })}
            />
          </Form.Group>

          <Form.Group as={Col} xs={4} sm={2} lg={1} controlId="dtcMin">
            <Form.Label className="small mb-1">DTC (min)</Form.Label>
            <Form.Control
              size="sm"
              type="number"
              step={0.1}
              min={0}
              max={10}
              {...form.register('dtcMin', { valueAsNumber: true })}
            />
          </Form.Group>

          <Form.Group as={Col} xs={4} sm={2} lg={1} controlId="rvolMin">
            <Form.Label className="small mb-1">RVOL (min)</Form.Label>
            <Form.Control
              size="sm"
              type="number"
              step={0.1}
              min={0}
              max={10}
              {...form.register('rvolMin', { valueAsNumber: true })}
            />
          </Form.Group>

          <Form.Group as={Col} xs={12} sm="auto" controlId="catalyst" className="d-flex align-items-end">
            <Form.Check
              type="checkbox"
              label="Catalyst"
              className="mb-1"
              {...form.register('catalyst')}
            />
          </Form.Group>
        </Row>

        <div className="mt-2">
          <ActiveFilterChips
            filters={activeFilters}
            onRemove={resetFilter}
            onClearAll={clearAllFilters}
            onAllRemoved={focusSearch}
          />
        </div>

        <Row className="g-2 align-items-end mt-1">
          <Form.Group as={Col} xs={12} sm={6} lg={3} controlId="sort">
            <Form.Label className="small mb-1">Sort</Form.Label>
            <Form.Select size="sm" {...form.register('sort')}>
              {sortKeys.map((key) => (
                <option key={key} value={key}>{SORT_LABELS[key]}</option>
              ))}
            </Form.Select>
          </Form.Group>

          <Col xs={12} sm="auto">
            <span id="sort-dir-label" className="form-label small mb-1 d-block">Sort Direction</span>
            <div role="group" aria-labelledby="sort-dir-label">
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

      <ScreenerSummary
        shown={tableRows.length}
        total={data?.length ?? 0}
        sort={watched.sort}
        dir={watched.dir}
        activeFilterCount={activeFilters.length}
      />

      <ScreenerTable
        rows={tableRows}
        activeSort={watched.sort}
        dir={watched.dir}
        onSort={onSort}
      />
    </section>
  );
}
