import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import type { TickerRow } from '../../../lib/types';
import ScreenerPage from '../ScreenerPage';

const rows: TickerRow[] = [
  { ticker: 'AAA', price: 1, pctChange: 1, siPublic: 30, siBroad: 30, dtc: 3, rvol: 2, catalyst: true },
  { ticker: 'BBB', price: 2, pctChange: -1, siPublic: 5, siBroad: 6, dtc: 1, rvol: 1, catalyst: false },
  { ticker: 'CCC', price: 3, pctChange: 0, siPublic: 15, siBroad: 20, dtc: 2, rvol: 3, catalyst: true },
];

vi.mock('../client', () => ({
  fetchTickers: () => Promise.resolve(rows),
}));

function LocationProbe() {
  const { search } = useLocation();
  return <div data-testid="search">{search}</div>;
}

function renderAt(url: string) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[url]}>
        <Routes>
          <Route
            path="/screener"
            element={
              <>
                <ScreenerPage />
                <LocationProbe />
              </>
            }
          />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

const params = () => new URLSearchParams(screen.getByTestId('search').textContent ?? '');
const chipList = () => screen.queryByRole('list', { name: 'Active filters' });

describe('ScreenerPage toolbar', () => {
  beforeEach(() => localStorage.clear());

  it('shows the zero state and full summary with no filters', async () => {
    renderAt('/screener');
    expect(await screen.findByText('No active filters')).toBeInTheDocument();
    expect(chipList()).toBeNull();
    expect(screen.queryByRole('button', { name: 'Clear all' })).toBeNull();
    expect(screen.getByRole('status')).toHaveTextContent(
      'Showing 3 of 3 tickers · Sorted by Ticker, ascending'
    );
  });

  it('renders chips and summary from URL params', async () => {
    renderAt('/screener?siMin=10&catalyst=1&sort=dtc&dir=desc');
    const list = await screen.findByRole('list', { name: 'Active filters' });
    const chips = within(list).getAllByRole('button');
    expect(chips.map((c) => c.getAttribute('aria-label'))).toEqual([
      'Remove Short interest filter: SI% ≥ 10',
      'Remove Catalyst filter: Catalyst only',
    ]);
    expect(screen.getByRole('status')).toHaveTextContent(
      'Showing 2 of 3 tickers · Sorted by DTC, descending · 2 filters active'
    );
  });

  it('adds a chip when a filter is set and syncs it to the URL', async () => {
    const user = userEvent.setup();
    renderAt('/screener');
    await user.click(await screen.findByLabelText('Catalyst'));
    expect(screen.getByRole('button', { name: /^Remove Catalyst filter/ })).toBeInTheDocument();
    expect(params().get('catalyst')).toBe('1');
    expect(screen.getByRole('status')).toHaveTextContent('Showing 2 of 3 tickers');
  });

  it('removing a chip resets the control, results and URL', async () => {
    const user = userEvent.setup();
    renderAt('/screener?siMin=10&rvolMin=1.5');
    await user.click(await screen.findByRole('button', { name: /^Remove Short interest filter/ }));

    expect(screen.getByLabelText('SI% (min)')).toHaveValue(0);
    expect(params().has('siMin')).toBe(false);
    expect(params().get('rvolMin')).toBe('1.5');
    expect(screen.getByRole('status')).toHaveTextContent('Showing 2 of 3 tickers · Sorted by Ticker, ascending · 1 filter active');
    // Focus moves to the remaining chip instead of being lost.
    expect(screen.getByRole('button', { name: /^Remove Relative volume filter/ })).toHaveFocus();
  });

  it('chip removal is keyboard operable (Enter and Space)', async () => {
    const user = userEvent.setup();
    renderAt('/screener?q=a&catalyst=1');
    const searchChip = await screen.findByRole('button', { name: /^Remove Search filter/ });
    searchChip.focus();
    await user.keyboard('{Enter}');
    expect(screen.getByLabelText('Search')).toHaveValue('');
    const catalystChip = screen.getByRole('button', { name: /^Remove Catalyst filter/ });
    expect(catalystChip).toHaveFocus();
    await user.keyboard(' ');
    expect(screen.getByLabelText('Catalyst')).not.toBeChecked();
    expect(chipList()).toBeNull();
    // Last chip removed: focus returns to the search input.
    expect(screen.getByLabelText('Search')).toHaveFocus();
    expect(params().toString()).toBe('sort=ticker&dir=asc');
  });

  it('Clear all resets every filter, keeps sort, and updates the URL', async () => {
    const user = userEvent.setup();
    renderAt('/screener?q=c&siMin=10&dtcMin=1&rvolMin=1&catalyst=1&sort=price&dir=desc');
    await user.click(await screen.findByRole('button', { name: 'Clear all' }));

    expect(screen.getByText('No active filters')).toBeInTheDocument();
    expect(screen.getByLabelText('Search')).toHaveValue('');
    expect(screen.getByLabelText('DTC (min)')).toHaveValue(0);
    expect(params().toString()).toBe('sort=price&dir=desc');
    expect(screen.getByRole('status')).toHaveTextContent('Showing 3 of 3 tickers · Sorted by Price, descending');
    expect(screen.getByLabelText('Search')).toHaveFocus();
  });

  it('keeps tab order: search → filters → chips → Clear all → sort', async () => {
    const user = userEvent.setup();
    renderAt('/screener?catalyst=1');
    await screen.findByRole('button', { name: 'Clear all' });
    screen.getByLabelText('Search').focus();

    const order: string[] = [];
    for (let i = 0; i < 7; i++) {
      await user.tab();
      const el = document.activeElement as HTMLElement;
      order.push(el.getAttribute('aria-label') || el.id || (el.textContent ?? ''));
    }
    expect(order).toEqual([
      'siMin',
      'dtcMin',
      'rvolMin',
      'catalyst',
      'Remove Catalyst filter: Catalyst only',
      'Clear all',
      'sort',
    ]);
  });

  it('updates the summary live when sort and direction change', async () => {
    const user = userEvent.setup();
    renderAt('/screener');
    await user.selectOptions(await screen.findByLabelText('Sort'), 'rvol');
    expect(screen.getByRole('status')).toHaveTextContent('Sorted by RVOL, ascending');
    await user.click(screen.getByRole('button', { name: 'Desc' }));
    expect(screen.getByRole('status')).toHaveTextContent('Sorted by RVOL, descending');
    expect(params().get('sort')).toBe('rvol');
    expect(params().get('dir')).toBe('desc');
    const firstTicker = screen.getAllByRole('row')[1];
    expect(firstTicker).toHaveTextContent('CCC');
  });

  it('moves focus to the previous chip when the last chip in the row is removed', async () => {
    const user = userEvent.setup();
    renderAt('/screener?siMin=10&catalyst=1');
    await user.click(await screen.findByRole('button', { name: /^Remove Catalyst filter/ }));
    expect(screen.getByRole('button', { name: /^Remove Short interest filter/ })).toHaveFocus();
  });

  it('labels the sort direction buttons as a group', async () => {
    renderAt('/screener');
    const group = await screen.findByRole('group', { name: 'Sort Direction' });
    expect(within(group).getByRole('button', { name: 'Asc' })).toHaveAttribute('aria-pressed', 'true');
  });
});
