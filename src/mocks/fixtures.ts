import tickers from './data/tickers.json';
import metrics from './data/metrics.json';
import type { TickerRow, TickerMetrics } from '../lib/types';

// Typed fixture lists used by MSW and prod demo
export const tickerFixtures = tickers as TickerRow[];
export const metricsFixtures = metrics as TickerMetrics[];

const norm = (s: unknown) => String(s ?? '').trim().toUpperCase();

type SeriesPoint = TickerMetrics['series'][number];

function makeSeries(days = 60, startPrice = 100): SeriesPoint[] {
  const out: SeriesPoint[] = [];
  let price = startPrice;

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);

    // Small random walk around the base price
    const delta = (Math.random() - 0.5) * 2; // roughly [-1, 1]
    price = Math.max(1, price + delta);

    out.push({
      t: d.toISOString().slice(0, 10),
      price: Number(price.toFixed(2)),
      // Rough intra-day volume – just for chart/tooltips if we ever use it
      vol: Math.floor(5_000 + Math.random() * 25_000),
    });
  }

  return out;
}

function makeMetrics(ticker: string): TickerMetrics {
  const base = 50 + Math.random() * 150; // 50–200

  return {
    ticker,
    siPublic: Number((Math.random() * 20).toFixed(1)),
    siBroad: Number((Math.random() * 30).toFixed(1)),
    dtc: Number((Math.random() * 5).toFixed(1)),
    rvol30d: Number((0.8 + Math.random() * 2.4).toFixed(1)),
    squeezeScore: Math.floor(Math.random() * 100),
    series: makeSeries(60, base),
  };
}

// Lookup helper that prefers the static fixtures but can synthesize metrics
export function findOrCreateMetrics(symbol: string): TickerMetrics {
  const target = norm(symbol);
  const hit = metricsFixtures.find(m => norm(m.ticker) === target);
  return hit ?? makeMetrics(target);
}
