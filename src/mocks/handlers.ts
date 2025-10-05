import { http, HttpResponse } from 'msw';
import tickers from './data/tickers.json';
import metrics from './data/metrics.json';

type SeriesPoint = { t: string; price: number };
type TickerMetrics = {
  ticker: string;
  siPublic: number;
  siBroad: number;
  dtc: number;
  rvol30d: number;
  squeezeScore: number;
  series: SeriesPoint[];
};

const DELAY_MS = 0;

const norm = (s: unknown) => String(s ?? '').trim().toUpperCase();

function makeSeries(days = 60, startPrice = 100): SeriesPoint[] {
  const out: SeriesPoint[] = [];
  let price = startPrice;
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const delta = (Math.random() - 0.5) * 2; // ~[-1, 1]
    price = Math.max(1, price + delta);
    out.push({ t: d.toISOString().slice(0, 10), price: Number(price.toFixed(2)) });
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

function findOrCreateMetrics(symbol: string): TickerMetrics {
  const target = norm(symbol);
  const hit = (metrics as TickerMetrics[]).find(m => norm(m.ticker) === target);
  return hit ?? makeMetrics(target);
}

export const handlers = [
  http.get('/api/tickers', async () => {
    if (DELAY_MS) await new Promise(r => setTimeout(r, DELAY_MS));
    return HttpResponse.json(tickers, { status: 200 });
  }),

  http.get('/api/tickers/:symbol', async ({ params }) => {
    const symbol = norm(params.symbol);
    if (!symbol) {
      return HttpResponse.json({ message: 'Missing symbol' }, { status: 400 });
    }
    if (DELAY_MS) await new Promise(r => setTimeout(r, DELAY_MS));
    const m = findOrCreateMetrics(symbol);
    return HttpResponse.json(m, { status: 200 });
  }),
];
