import { Container, Stack } from 'react-bootstrap';
import { BackToScreenerButton } from '../components/ui/BackToScreenerButton';

export default function NotFound() {
  return (
    // Rendered inside AppShell, which already provides the <main> landmark.
    <section aria-labelledby="notfound-title">
      <Container className="py-5">
        <Stack gap={3} className="text-center align-items-center">
          <h1 id="notfound-title" className="display-6 m-0">
            Page not found
          </h1>
          <p className="ss-muted m-0">
            The page you're looking for does not exist.
          </p>
          <BackToScreenerButton className="mt-2" />
        </Stack>
      </Container>
    </section>
  );
};
