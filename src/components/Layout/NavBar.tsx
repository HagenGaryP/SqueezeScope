import { Navbar, Container, Nav } from 'react-bootstrap'
import { Link, NavLink } from 'react-router-dom'

export default function NavBar() {
  return (
    <Navbar bg="dark" variant="dark" expand="sm">
      <Container>
        <Navbar.Brand as={Link} to="/">SqueezeScope</Navbar.Brand>
        <Navbar.Toggle />
        <Navbar.Collapse>
          <Nav className="me-auto">
            <Nav.Link as={NavLink} to="/screener">Screener</Nav.Link>
            <Nav.Link as={NavLink} to="/watchlists">Watchlist</Nav.Link>
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  )
}
