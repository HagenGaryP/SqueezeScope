import React from 'react';
import ReactDOM from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { router } from './app/router';
import { ErrorBoundary } from './components/ui/ErrorBoundary';
import 'bootstrap/dist/css/bootstrap.min.css';
import './styles/globals.css';

const qc = new QueryClient();

async function prepare() {
  const enableMock =
  import.meta.env.DEV || import.meta.env.VITE_ENABLE_MSW === '1';

  if (enableMock) {
    const { worker } = await import('./mocks/browser');
    await worker.start({
      serviceWorker: { url: '/mockServiceWorker.js' },
      onUnhandledRequest: 'bypass',
    });
  };
};

prepare().then(() => {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <ErrorBoundary>
        <QueryClientProvider client={qc}>
          <RouterProvider router={router} />
        </QueryClientProvider>
      </ErrorBoundary>
    </React.StrictMode>
  );
});
