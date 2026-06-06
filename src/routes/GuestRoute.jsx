import { Navigate } from 'react-router-dom'
import AuthLoading from '../components/AuthLoading'
import { useAuth } from '../hooks/useAuth'

/** Redirects authenticated users away from login/signup pages. */
export default function GuestRoute({ children }) {
  const { session, initializing } = useAuth()

  if (initializing) {
    return <AuthLoading message="Checking your session…" />
  }

  if (session) {
    return <Navigate to="/dashboard" replace />
  }

  return children
}
