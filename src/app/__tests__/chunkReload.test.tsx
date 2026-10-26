import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { CHUNK_RELOAD_KEY, isChunkLoadError, reloadedRecently } from '../chunkReload';
import RouteErrorFallback from '../../pages/RouteErrorFallback';

const chunkError = () => new TypeError('Failed to fetch dynamically imported module: /assets/X.js');

function renderWithError(error: Error) {
  const router = createMemoryRouter(
    [
      {
        path: '/',
        errorElement: <RouteErrorFallback />,
        hydrateFallbackElement: <div />,
        children: [
          {
            path: 'ticker/:symbol',
            lazy: async () => {
              throw error;
            },
          },
        ],
      },
    ],
    { initialEntries: ['/ticker/ABC'] }
  );
  return render(<RouterProvider router={router} />);
}

describe('chunk reload helpers', () => {
  beforeEach(() => sessionStorage.clear());

  it('recognises dynamic import failures across browsers', () => {
    expect(isChunkLoadError(chunkError())).toBe(true);
    expect(isChunkLoadError(new TypeError('Importing a module script failed.'))).toBe(true);
    expect(isChunkLoadError(new TypeError('error loading dynamically imported module'))).toBe(true);
    expect(isChunkLoadError(new Error('boom'))).toBe(false);
    expect(isChunkLoadError('Failed to fetch dynamically imported module')).toBe(false);
  });

  it('treats a reload within the last 10 s as recent', () => {
    expect(reloadedRecently(1_000_000)).toBe(false);
    sessionStorage.setItem(CHUNK_RELOAD_KEY, String(1_000_000));
    expect(reloadedRecently(1_005_000)).toBe(true);
    expect(reloadedRecently(1_010_001)).toBe(false);
  });
});

describe('RouteErrorFallback', () => {
  const reload = vi.fn();

  beforeEach(() => {
    sessionStorage.clear();
    reload.mockReset();
    vi.stubGlobal('location', { ...window.location, reload });
  });
  afterEach(() => vi.unstubAllGlobals());

  it('reloads once on a chunk load error and shows the loading state', async () => {
    renderWithError(chunkError());
    expect(await screen.findByRole('status', { name: 'Loading page…' })).toBeInTheDocument();
    expect(reload).toHaveBeenCalledTimes(1);
    expect(Number(sessionStorage.getItem(CHUNK_RELOAD_KEY))).toBeGreaterThan(0);
  });

  it('shows the error page instead of reloading again right after a reload', async () => {
    sessionStorage.setItem(CHUNK_RELOAD_KEY, String(Date.now()));
    renderWithError(chunkError());
    expect(await screen.findByRole('heading', { name: 'Something went wrong' })).toBeInTheDocument();
    expect(reload).not.toHaveBeenCalled();
  });

  it('shows the error page (with its message) for other errors', async () => {
    renderWithError(new Error('boom'));
    expect(await screen.findByRole('heading', { name: 'Something went wrong' })).toBeInTheDocument();
    expect(screen.getByText('boom')).toBeInTheDocument();
    expect(reload).not.toHaveBeenCalled();
  });
});
