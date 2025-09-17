import { Container } from 'react-bootstrap'
import { Outlet } from 'react-router-dom'
import NavBar from './NavBar'

export default function AppShell() {
  return (
    <>
      <NavBar />
      <Container className="py-4">
        <Outlet />
      </Container>
    </>
  )
}
