import { Spinner } from 'react-bootstrap';

/** Shown while a lazy route's code loads on a direct (first) page load. */
export function RouteFallback() {
  return (
    <main className="d-flex justify-content-center py-5">
      <Spinner animation="border" role="status" aria-label="Loading page…" />
    </main>
  );
}
