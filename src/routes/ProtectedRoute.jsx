import { Navigate, useLocation } from 'react-router-dom'
import AuthLoading from '../components/AuthLoading'
import { useAuth } from '../hooks/useAuth'

export default function ProtectedRoute({ children }) {
  const { session, initializing } = useAuth()
  const location = useLocation()

  if (initializing) {
    return <AuthLoading message="Checking your session…" />
  }

  if (!session) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  return children
}
