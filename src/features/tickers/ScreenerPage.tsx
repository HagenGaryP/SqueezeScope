import * as React from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, Spinner, Button, Alert } from 'react-bootstrap';

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

  // Sort handler
  const onSort = (col: SortKey) => {
    const cur = form.getValues();
    if (col === cur.sort) {
      form.setValue('dir', cur.dir === 'asc' ? 'desc' : 'asc');
    } else {
      form.setValue('sort', col);
      form.setValue('dir', 'asc');
    }
  };

  const watched = form.watch();
  const chips = React.useMemo(() => getActiveFilterChips(watched), [watched]);

  const removeChip = (id: ActiveFilterId) => {
    form.setValue(id, CLEAR_VALUE_BY_ID[id], {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    });
  };

  const clearAll = () => {
    form.reset(SCREENER_DEFAULTS);
  };

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
        {/* Toolbar */}
        <Form className="mb-2" noValidate onSubmit={(e) => e.preventDefault()}>
          {/* < lg: stacked (filters row, then sort row)
              >= lg: single row (sort/direction pushed right) */}
          <div className="d-flex flex-column flex-lg-row align-items-stretch align-items-lg-end gap-2">
            {/* Left cluster: Search + filters */}
            <div className="d-flex flex-wrap align-items-end gap-2">
              <Form.Group controlId="q">
                <Form.Label className="small text-body-secondary mb-1">Search</Form.Label>
                <Form.Control
                  size="sm"
                  placeholder="Ticker…"
                  inputMode="search"
                  autoCapitalize="characters"
                  style={{ width: '9ch' }}
                  {...form.register('q')}
                />
              </Form.Group>

              <Form.Group controlId="siMin">
                <Form.Label className="small text-body-secondary mb-1">SI%</Form.Label>
                <Form.Control
                  size="sm"
                  type="number"
                  step={1}
                  min={0}
                  max={100}
                  style={{ width: '6ch' }}
                  {...form.register('siMin', { valueAsNumber: true })}
                />
              </Form.Group>

              <Form.Group controlId="dtcMin">
                <Form.Label className="small text-body-secondary mb-1">DTC</Form.Label>
                <Form.Control
                  size="sm"
                  type="number"
                  step={0.1}
                  min={0}
                  max={10}
                  style={{ width: '6ch' }}
                  {...form.register('dtcMin', { valueAsNumber: true })}
                />
              </Form.Group>

              <Form.Group controlId="rvolMin">
                <Form.Label className="small text-body-secondary mb-1">RVOL</Form.Label>
                <Form.Control
                  size="sm"
                  type="number"
                  step={0.1}
                  min={0}
                  max={10}
                  style={{ width: '6ch' }}
                  {...form.register('rvolMin', { valueAsNumber: true })}
                />
              </Form.Group>

              <div>
                <div className="small text-body-secondary mb-1">&nbsp;</div>
                <Button
                  type="button"
                  size="sm"
                  className="rounded-pill py-0"
                  style={{ height: 31, whiteSpace: 'nowrap' }}
                  variant={watched.catalyst ? 'primary' : 'outline-secondary'}
                  onClick={() =>
                    form.setValue('catalyst', !watched.catalyst, {
                      shouldDirty: true,
                      shouldTouch: true,
                      shouldValidate: true,
                    })
                  }
                  aria-pressed={watched.catalyst}
                  aria-label={watched.catalyst ? 'Disable Catalyst filter' : 'Enable Catalyst filter'}
                >
                  Catalyst
                </Button>
              </div>
            </div>

            {/* Right cluster: Sort + direction (on its own row under lg, on same row at lg+) */}
            <div className="ms-lg-auto d-flex flex-wrap flex-md-nowrap align-items-end gap-2 justify-content-start justify-content-lg-end">
              <Form.Group controlId="sort">
                <Form.Label className="small text-body-secondary mb-1">Sort</Form.Label>
                <Form.Select size="sm" style={{ width: '16ch' }} {...form.register('sort')}>
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

              <div>
                <div className="small text-body-secondary mb-1">Direction</div>
                <div className="btn-group" role="group" aria-label="Sort direction">
                  <Button
                    type="button"
                    variant={watched.dir === 'asc' ? 'primary' : 'outline-secondary'}
                    size="sm"
                    onClick={() => form.setValue('dir', 'asc')}
                    aria-pressed={watched.dir === 'asc'}
                  >
                    Asc
                  </Button>
                  <Button
                    type="button"
                    variant={watched.dir === 'desc' ? 'primary' : 'outline-secondary'}
                    size="sm"
                    onClick={() => form.setValue('dir', 'desc')}
                    aria-pressed={watched.dir === 'desc'}
                  >
                    Desc
                  </Button>
                </div>
              </div>
            </div>
          </div>
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
