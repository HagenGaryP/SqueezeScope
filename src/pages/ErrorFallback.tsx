import { isRouteErrorResponse, useRouteError } from 'react-router-dom'

export default function ErrorFallback() {
  const err = useRouteError()
  if (isRouteErrorResponse(err)) {
    return (
      <div style={{ padding: '1rem' }}>
        <h3>Oops — {err.status} {err.statusText}</h3>
        {err.data && <pre style={{ whiteSpace: 'pre-wrap' }}>{String(err.data)}</pre>}
      </div>
    )
  }
  return (
    <div style={{ padding: '1rem' }}>
      <h3>Unexpected Application Error</h3>
      <pre style={{ whiteSpace: 'pre-wrap' }}>{String((err as Error)?.message ?? err)}</pre>
    </div>
  )
}
