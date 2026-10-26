import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import type { ReactElement } from 'react';
import ScreenerPage from '../features/tickers/ScreenerPage';
import TickerDetailPage from '../features/tickers/TickerDetailPage';
import WatchlistPage from '../features/watchlists/WatchlistPage';
import { fetchTickers, fetchTickerMetrics } from '../features/tickers/client';

vi.mock('../features/tickers/client', () => ({
  fetchTickers: vi.fn(),
  fetchTickerMetrics: vi.fn(),
}));

const never = () => new Promise<never>(() => {});

function renderRoute(path: string, url: string, element: ReactElement) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[url]}>
        <Routes>
          <Route path={path} element={element} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

// Every page state must keep exactly one h1 (axe page-has-heading-one).
describe('page headings in loading and error states', () => {
  beforeEach(() => {
    vi.mocked(fetchTickers).mockReset();
    vi.mocked(fetchTickerMetrics).mockReset();
  });

  it('screener: loading', () => {
    vi.mocked(fetchTickers).mockImplementation(never);
    renderRoute('/screener', '/screener', <ScreenerPage />);
    expect(screen.getByRole('status', { name: 'Loading tickers…' })).toBeInTheDocument();
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(screen.getByRole('heading', { level: 1, name: 'Screener' })).toBeInTheDocument();
  });

  it('screener: error', async () => {
    vi.mocked(fetchTickers).mockRejectedValue(new Error('boom'));
    renderRoute('/screener', '/screener', <ScreenerPage />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Failed to load tickers');
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
  });

  it('watchlist: loading and error', async () => {
    vi.mocked(fetchTickers).mockImplementation(never);
    const { unmount } = renderRoute('/watchlists', '/watchlists', <WatchlistPage />);
    expect(screen.getByRole('heading', { level: 1, name: 'Watchlist' })).toBeInTheDocument();
    unmount();

    vi.mocked(fetchTickers).mockRejectedValue(new Error('boom'));
    renderRoute('/watchlists', '/watchlists', <WatchlistPage />);
    expect(await screen.findByText('Failed to load data. Try reloading.')).toBeInTheDocument();
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
  });

  it('ticker detail: loading and error use the symbol as h1', async () => {
    vi.mocked(fetchTickerMetrics).mockImplementation(never);
    const { unmount } = renderRoute('/ticker/:symbol', '/ticker/ABC', <TickerDetailPage />);
    expect(screen.getByRole('heading', { level: 1, name: 'ABC' })).toBeInTheDocument();
    unmount();

    vi.mocked(fetchTickerMetrics).mockRejectedValue(new Error('boom'));
    renderRoute('/ticker/:symbol', '/ticker/ABC', <TickerDetailPage />);
    expect(await screen.findByText(/No data found for/)).toBeInTheDocument();
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
  });
});
