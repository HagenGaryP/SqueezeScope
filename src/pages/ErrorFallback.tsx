import { Container, Stack } from 'react-bootstrap';
import { BackToScreenerButton } from '../components/ui/BackToScreenerButton';

type Props = {
  error?: Error;
  onReset?: () => void;
};

export default function ErrorFallback({ error, onReset }: Props) {
  const isDev = import.meta.env.DEV;
  const message = (error && (error.message || String(error))) || 'An unexpected error occurred.';

  return (
    <Container className="py-5">
      <Stack gap={3} className="text-center align-items-center">
        <h1 className="display-6 m-0">
          Something went wrong
        </h1>
        <p className="text-muted m-0">
          {message}
        </p>

        {isDev && error?.stack && (
          <pre
            className="text-start w-100 border rounded p-3 mt-2 overflow-auto"
            style={{ maxHeight: 300 }}
          >
            {error.stack}
          </pre>
        )}

        <div className="d-flex gap-2 mt-2">
          {onReset && (
            <button type="button" className="btn btn-outline-secondary" onClick={onReset}>
              Try again
            </button>
          )}
          <BackToScreenerButton />
        </div>
      </Stack>
    </Container>
  )
}
