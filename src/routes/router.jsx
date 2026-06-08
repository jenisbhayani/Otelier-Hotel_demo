import { createBrowserRouter, Outlet } from 'react-router-dom'
import AppHeader from '../components/AppHeader'
import { CompareProvider } from '../context/CompareContext'
import { SearchProvider } from '../context/SearchContext'
import GuestRoute from './GuestRoute'
import ProtectedRoute from './ProtectedRoute'
import RootRedirect from './RootRedirect'
import Compare from '../pages/Compare'
import Dashboard from '../pages/Dashboard'
import Login from '../pages/Login'
import Signup from '../pages/Signup'

/** Shared layout — wraps every page with providers + header */
function AppLayout() {
  return (
    <CompareProvider>
      <SearchProvider>
        <div className="min-h-screen bg-slate-50 text-slate-900">
          <AppHeader />
          <Outlet />
        </div>
      </SearchProvider>
    </CompareProvider>
  )
}

const router = createBrowserRouter([
  {
    element: <AppLayout />,
    children: [
      {
        path: '/',
        element: <RootRedirect />,
      },
      {
        path: '/login',
        element: (
          <GuestRoute>
            <Login />
          </GuestRoute>
        ),
      },
      {
        path: '/signup',
        element: (
          <GuestRoute>
            <Signup />
          </GuestRoute>
        ),
      },
      {
        path: '/dashboard',
        element: (
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        ),
      },
      {
        path: '/compare',
        element: (
          <ProtectedRoute>
            <Compare />
          </ProtectedRoute>
        ),
      },
      {
        path: '*',
        element: <RootRedirect />,
      },
    ],
  },
])

export default router
