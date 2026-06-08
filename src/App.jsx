import { useState } from 'react'
import { BrowserRouter, NavLink, Route, Routes } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import Compare from './pages/Compare'
import Dashboard from './pages/Dashboard'
import Login from './pages/Login'
import Signup from './pages/Signup'
import { CompareProvider } from './context/CompareContext'
import { SearchProvider } from './context/SearchContext'
import GuestRoute from './routes/GuestRoute'
import ProtectedRoute from './routes/ProtectedRoute'
import RootRedirect from './routes/RootRedirect'

const navLinkClass = ({ isActive }) =>
  [
    'rounded px-3 py-1.5 text-sm font-medium transition-colors',
    isActive ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
  ].join(' ')

function AppHeader() {
  const { user, isAuthenticated, initializing, signOut } = useAuth()
  const [isSigningOut, setIsSigningOut] = useState(false)
  const [signOutError, setSignOutError] = useState('')

  async function handleSignOut() {
    setSignOutError('')
    setIsSigningOut(true)
    const { error } = await signOut()
    setIsSigningOut(false)
    if (error) {
      setSignOutError(error)
    }
  }

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-4 py-4">
        <NavLink to={isAuthenticated ? '/dashboard' : '/login'} className="text-lg font-semibold tracking-tight">
          Otelier Hotels
        </NavLink>

        <div className="flex flex-wrap items-center gap-3">
          {signOutError && (
            <span className="text-sm text-red-600" role="alert">
              {signOutError}
            </span>
          )}

          {!initializing && isAuthenticated && (
            <>
              <span className="hidden text-sm text-slate-600 sm:inline">{user?.email}</span>
              <nav className="flex flex-wrap gap-1" aria-label="Main">
                <NavLink to="/dashboard" className={navLinkClass}>
                  Dashboard
                </NavLink>
                <NavLink to="/compare" className={navLinkClass}>
                  Compare
                </NavLink>
              </nav>
              <button
                type="button"
                onClick={handleSignOut}
                disabled={isSigningOut}
                className="rounded px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 disabled:opacity-60"
              >
                {isSigningOut ? 'Signing out…' : 'Log out'}
              </button>
            </>
          )}

          {!initializing && !isAuthenticated && (
            <nav className="flex flex-wrap gap-1" aria-label="Main">
              <NavLink to="/login" className={navLinkClass}>
                Login
              </NavLink>
              <NavLink to="/signup" className={navLinkClass}>
                Sign up
              </NavLink>
            </nav>
          )}
        </div>
      </div>
    </header>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <CompareProvider>
        <SearchProvider>
          <div className="min-h-screen bg-slate-50 text-slate-900">
          <AppHeader />

          <Routes>
            <Route path="/" element={<RootRedirect />} />
            <Route
              path="/login"
              element={
                <GuestRoute>
                  <Login />
                </GuestRoute>
              }
            />
            <Route
              path="/signup"
              element={
                <GuestRoute>
                  <Signup />
                </GuestRoute>
              }
            />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/compare"
              element={
                <ProtectedRoute>
                  <Compare />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<RootRedirect />} />
          </Routes>
        </div>
        </SearchProvider>
      </CompareProvider>
    </BrowserRouter>
  )
}
