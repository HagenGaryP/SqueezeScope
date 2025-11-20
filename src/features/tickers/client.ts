import { api } from '../../lib/api';
import type { TickerRow, TickerMetrics } from '../../lib/types';
import { toTickerRows, type TickerQueryData } from './query';
import { tickerFixtures, findOrCreateMetrics } from '../../mocks/fixtures';

// Centralized tickers fetcher so Screener, Watchlist, and Ticker Detail
// can stay unaware of whether data is coming from MSW (dev) or static fixtures (prod demo).
const isProd = import.meta.env.PROD;

export async function fetchTickers(): Promise<TickerRow[]> {
  if (isProd) {
    // In the production demo, avoid any real backend and serve static data.
    // return a shallow copy so callers can't accidentally mutate fixtures.
    return tickerFixtures.slice();
  }

  const res = await api.get<TickerRow[] | { rows: TickerRow[] }>('/tickers');
  const data = res.data as TickerQueryData;
  return toTickerRows(data);
}

export async function fetchTickerMetrics(symbol: string): Promise<TickerMetrics> {
  if (isProd) {
    // In the production demo, lookup or synthesize metrics from fixtures.
    return findOrCreateMetrics(symbol);
  }

  const res = await api.get<TickerMetrics>(`/tickers/${symbol}`);
  return res.data;
}
