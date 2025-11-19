import { api } from '../../lib/api';
import type { TickerRow, TickerMetrics } from '../../lib/types';
import { toTickerRows, type TickerQueryData } from './query';

// Centralized tickers fetcher so Screener, Watchlist, and Ticker Detail
export async function fetchTickers(): Promise<TickerRow[]> {
  const res = await api.get<TickerRow[] | { rows: TickerRow[] }>('/tickers');
  const data = res.data as TickerQueryData;
  return toTickerRows(data);
}

export async function fetchTickerMetrics(symbol: string): Promise<TickerMetrics> {
  const res = await api.get<TickerMetrics>(`/tickers/${symbol}`);
  return res.data;
}
