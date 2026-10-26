import { Container } from 'react-bootstrap'
import { Outlet } from 'react-router-dom'
import NavBar from './NavBar'

export default function AppShell() {
  return (
    <>
      <NavBar />
      <Container as="main" className="py-4" fluid="lg">
        <Outlet />
      </Container>
    </>
  )
}
