import { useEffect } from 'react';
import { useRouteError } from 'react-router-dom';
import ErrorFallback from './ErrorFallback';
import { RouteFallback } from '../components/ui/RouteFallback';
import { CHUNK_RELOAD_KEY, isChunkLoadError, reloadedRecently } from '../app/chunkReload';

/**
 * Root route error element. A lazy route chunk that fails to load (typically a tab
 * opened before a redeploy) triggers one page reload, which fetches the new build at
 * the URL the user navigated to. Any other error, or a repeat failure, shows ErrorFallback.
 */
export default function RouteErrorFallback() {
  const error = useRouteError();
  const shouldReload = isChunkLoadError(error) && !reloadedRecently();

  useEffect(() => {
    if (!shouldReload) return;
    try {
      sessionStorage.setItem(CHUNK_RELOAD_KEY, String(Date.now()));
    } catch {
      return;
    }
    window.location.reload();
  }, [shouldReload]);

  if (shouldReload) return <RouteFallback />;
  return <ErrorFallback error={error instanceof Error ? error : undefined} />;
}
