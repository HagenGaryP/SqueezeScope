import { http, HttpResponse } from 'msw'
import tickers from './data/tickers.json'
import metrics from './data/metrics.json'

export const handlers = [
  http.get('/api/tickers', () => HttpResponse.json(tickers)),
  http.get('/api/tickers/:symbol', ({ params }) => {
    const m = metrics.find(x => x.ticker === params.symbol)
    if (!m) {
      return HttpResponse.json({ message: 'Not found' }, { status: 404 })
    }
    return HttpResponse.json(m)
  }),
]
