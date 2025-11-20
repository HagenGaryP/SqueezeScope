import { http, HttpResponse } from 'msw';
import { tickerFixtures, findOrCreateMetrics } from './fixtures';

const DELAY_MS = 0;

const norm = (s: unknown) => String(s ?? '').trim().toUpperCase();

export const handlers = [
  // List tickers – used by Screener and Watchlist via fetchTickers
  http.get('/api/tickers', async () => {
    if (DELAY_MS) await new Promise(r => setTimeout(r, DELAY_MS));
    return HttpResponse.json(tickerFixtures, { status: 200 });
  }),

  // Detail metrics – used by Ticker Detail via fetchTickerMetrics
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
