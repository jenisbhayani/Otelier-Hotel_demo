import { BrowserRouter, Route, Routes } from 'react-router-dom'
import AppHeader from './components/AppHeader'
import Compare from './pages/Compare'
import Dashboard from './pages/Dashboard'
import Login from './pages/Login'
import Signup from './pages/Signup'
import { CompareProvider } from './context/CompareContext'
import { SearchProvider } from './context/SearchContext'
import GuestRoute from './routes/GuestRoute'
import ProtectedRoute from './routes/ProtectedRoute'
import RootRedirect from './routes/RootRedirect'

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
