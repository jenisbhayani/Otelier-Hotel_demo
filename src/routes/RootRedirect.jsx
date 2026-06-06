import { Navigate } from 'react-router-dom'
import AuthLoading from '../components/AuthLoading'
import { useAuth } from '../hooks/useAuth'

export default function RootRedirect() {
  const { session, initializing } = useAuth()

  if (initializing) {
    return <AuthLoading />
  }

  return <Navigate to={session ? '/dashboard' : '/login'} replace />
}
