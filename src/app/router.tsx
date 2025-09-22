import { createBrowserRouter } from 'react-router-dom'
import AppShell from '../components/Layout/AppShell'
import ErrorFallback from '../pages/ErrorFallback'
import HomePage from '../pages/HomePage'
import ScreenerPage from '../features/tickers/ScreenerPage'
import TickerDetailPage from '../features/tickers/TickerDetailPage'
import NotFound from '../pages/NotFound'
import WatchlistPage from '../features/watchlists/WatchlistPage'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppShell />,
    errorElement: <ErrorFallback />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'screener', element: <ScreenerPage /> },
      { path: 'ticker/:symbol', element: <TickerDetailPage /> },
      { path: '*', element: <NotFound /> },
      { path: 'watchlists', element: <WatchlistPage /> },
    ],
  },
])
