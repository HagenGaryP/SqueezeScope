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

import { ScreenerFormSchema, type ScreenerValues, type SortKey } from './screenerSchema';
import { filterRows } from './filter';
import { sortRows, type SortKey as SortKeyForSort } from './sort';
import { SCREENER_DEFAULTS, valuesFromParams, useScreenerUrlSync } from './urlState';
import { TICKERS_QUERY_KEY } from './query';
import { fetchTickers } from './client';

import { getActiveFilterChips, type ActiveFilterId } from './utils/activeFilters';

const CLEAR_VALUE_BY_ID: Record<ActiveFilterId, ScreenerValues[ActiveFilterId]> = {
  q: SCREENER_DEFAULTS.q,
  siMin: SCREENER_DEFAULTS.siMin,
  dtcMin: SCREENER_DEFAULTS.dtcMin,
  rvolMin: SCREENER_DEFAULTS.rvolMin,
  catalyst: SCREENER_DEFAULTS.catalyst,
};

export default function ScreenerPage() {
  // Data
  const { data, isFetching, isLoading, error } = useQuery<TickerRow[]>({
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

  // Handlers
  const onSort = React.useCallback(
    (col: SortKey) => {
      const cur = form.getValues();
      if (col === cur.sort) {
        form.setValue('dir', cur.dir === 'asc' ? 'desc' : 'asc');
      } else {
        form.setValue('sort', col);
        form.setValue('dir', 'asc');
      }
    },
    [form]
  );

  const watched = form.watch();

  const chips = React.useMemo(() => getActiveFilterChips(watched), [watched]);

  const removeChip = React.useCallback(
    (id: ActiveFilterId) => {
      form.setValue(id, CLEAR_VALUE_BY_ID[id], {
        shouldDirty: true,
        shouldValidate: true,
      });
    },
    [form]
  );

  const clearAll = React.useCallback(() => {
    form.reset(SCREENER_DEFAULTS);
  }, [form]);

  // Derived rows (filter + sort)
  const tableRows: TickerRow[] = React.useMemo(() => {
    const base = data ?? [];
    const filtered = filterRows(base, {
      q: watched.q,
      siMin: watched.siMin,
      dtcMin: watched.dtcMin,
      rvolMin: watched.rvolMin,
      catalyst: watched.catalyst,
    });
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
      <h2 id="screener-heading" className="mb-3">
        Screener
      </h2>
      <div className="border rounded-3 p-2 mb-3 bg-light text-dark shadow-sm">
        <Form className="mb-3" noValidate onSubmit={(e) => e.preventDefault()}>
          <Row className="g-2 align-items-end">
            <Form.Group as={Col} xs={12} md={4} controlId="q">
              <Form.Label>Search</Form.Label>
              <Form.Control
                placeholder="Ticker…"
                inputMode="search"
                autoCapitalize="characters"
                {...form.register('q')}
              />
            </Form.Group>

            <Form.Group as={Col} xs={6} md={2} controlId="siMin">
              <Form.Label>SI% (min)</Form.Label>
              <Form.Control
                type="number"
                step={1}
                min={0}
                max={100}
                {...form.register('siMin', { valueAsNumber: true })}
              />
            </Form.Group>

            <Form.Group as={Col} xs={6} md={2} controlId="dtcMin">
              <Form.Label>DTC (min)</Form.Label>
              <Form.Control
                type="number"
                step={0.1}
                min={0}
                max={10}
                {...form.register('dtcMin', { valueAsNumber: true })}
              />
            </Form.Group>

            <Form.Group as={Col} xs={6} md={2} controlId="rvolMin">
              <Form.Label>RVOL (min)</Form.Label>
              <Form.Control
                type="number"
                step={0.1}
                min={0}
                max={10}
                {...form.register('rvolMin', { valueAsNumber: true })}
              />
            </Form.Group>

            <Form.Group
              as={Col}
              xs={6}
              md="auto"
              controlId="catalyst"
              className="ms-md-auto d-flex align-items-end"
            >
              <Form.Check type="checkbox" label="Catalyst" className="mb-1" {...form.register('catalyst')} />
            </Form.Group>
          </Row>

          <Row className="g-2 align-items-end mt-1">
            <Form.Group as={Col} xs={12} md={3} controlId="sort">
              <Form.Label>Sort</Form.Label>
              <Form.Select {...form.register('sort')}>
                <option value="ticker">Ticker</option>
                <option value="siPublic">SI% Public</option>
                <option value="siBroad">SI% Broad</option>
                <option value="rvol">RVOL</option>
                <option value="dtc">DTC</option>
                <option value="squeezeScore">Squeeze Score</option>
                <option value="pctChange">% Change</option>
                <option value="price">Price</option>
              </Form.Select>
            </Form.Group>

            <Col xs={12} md="auto" className="ms-md-auto">
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

        <ScreenerSummary
          shownCount={tableRows.length}
          totalCount={(data ?? []).length}
          sort={watched.sort}
          dir={watched.dir}
          activeFilterCount={chips.length}
          isUpdating={isFetching}
        />

        <ActiveFilterChips chips={chips} onRemove={removeChip} onClearAll={clearAll} />
      </div>

      <ScreenerTable rows={tableRows} activeSort={watched.sort} dir={watched.dir} onSort={onSort} />
    </section>
  );
}
