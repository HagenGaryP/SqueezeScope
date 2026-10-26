import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import type { TickerRow } from '../../../lib/types';
import ScreenerPage from '../ScreenerPage';
import { filterRows } from '../filter';
import { computeSqueezeScore } from '../squeezeScore';

const rows: TickerRow[] = Array.from({ length: 50 }, (_, i) => ({
  ticker: `T${String(i).padStart(2, '0')}`,
  price: i,
  pctChange: 0,
  siPublic: i,
  siBroad: i,
  dtc: i % 10,
  rvol: (i % 5) + 0.5,
  catalyst: i % 2 === 0,
}));

vi.mock('../client', () => ({ fetchTickers: () => Promise.resolve(rows) }));

// Wrap the real filter so derivation runs can be counted.
vi.mock('../filter', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../filter')>();
  return { ...actual, filterRows: vi.fn(actual.filterRows) };
});

vi.mock('../squeezeScore', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../squeezeScore')>();
  return { ...actual, computeSqueezeScore: vi.fn(actual.computeSqueezeScore) };
});

describe('ScreenerPage derived rows', () => {
  it('recomputes filtered rows once per filter change, not on every render', async () => {
    const user = userEvent.setup();
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={qc}>
        <MemoryRouter initialEntries={['/screener']}>
          <Routes>
            <Route path="/screener" element={<ScreenerPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );
    const search = await screen.findByLabelText('Search');
    const calls = () => vi.mocked(filterRows).mock.calls.length;

    const before = calls();
    await user.type(search, 'T1');
    // One recompute per distinct value ("T", "T1"); URL-sync re-renders must not add more.
    expect(calls() - before).toBe(2);

    // Watchlist toggles re-render the table but do not change filters.
    const afterTyping = calls();
    const scoreCalls = () => vi.mocked(computeSqueezeScore).mock.calls.length;
    const scoresBefore = scoreCalls();
    await user.click(screen.getByRole('button', { name: 'Add T10 to watchlist' }));
    expect(calls()).toBe(afterTyping);
    expect(scoreCalls()).toBe(scoresBefore);
  });
});
