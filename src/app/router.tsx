import { createBrowserRouter } from 'react-router-dom'
import AppShell from '../components/Layout/AppShell'
import ErrorFallback from '../pages/ErrorFallback'
import { RouteFallback } from '../components/ui/RouteFallback'
import HomePage from '../pages/HomePage'
import ScreenerPage from '../features/tickers/ScreenerPage'
import NotFound from '../pages/NotFound'
import WatchlistPage from '../features/watchlists/WatchlistPage'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppShell />,
    errorElement: <ErrorFallback />,
    // Rendered until lazy route code (ticker detail) has loaded on a direct visit.
    hydrateFallbackElement: <RouteFallback />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'screener', element: <ScreenerPage /> },
      {
        path: 'ticker/:symbol',
        // Lazy so Recharts (detail-only) is split out of the entry chunk.
        lazy: async () => ({
          Component: (await import('../features/tickers/TickerDetailPage')).default,
        }),
      },
      { path: '*', element: <NotFound /> },
      { path: 'watchlists', element: <WatchlistPage /> },
    ],
  },
])
