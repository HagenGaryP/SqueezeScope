import { Container, Stack } from 'react-bootstrap';
import { BackToScreenerButton } from '../components/ui/BackToScreenerButton';

export default function NotFound() {
  return (
    <main role="main" aria-labelledby="notfound-title">
      <Container className="py-5">
        <Stack gap={3} className="text-center align-items-center">
          <h1 className="display-6 m-0">
            Page not found
          </h1>
          <p className="text-muted m-0">
            The page you're looking for does not exist.
          </p>
          <BackToScreenerButton className="mt-2" />
        </Stack>
      </Container>
    </main>
  );
};
