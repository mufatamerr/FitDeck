import { useAuth0 } from '@auth0/auth0-react'
import type { ReactNode } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { AppHome } from './pages/AppHome'
import { CallbackPage } from './pages/CallbackPage'
import { DiscoverPage } from './pages/DiscoverPage'
import { LandingPage } from './pages/LandingPage'
import { WardrobeAddPage } from './pages/WardrobeAddPage'
import { WardrobePage } from './pages/WardrobePage'
import { AdminUsersPage } from './pages/AdminUsersPage'
import { BuilderPage } from './pages/BuilderPage'
import { ClosetPage } from './pages/ClosetPage'

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth0()

  if (isLoading) {
    return (
      <div className="flex min-h-dvh items-center justify-center text-zinc-400">
        Loading…
      </div>
    )
  }
  if (!isAuthenticated) {
    return <Navigate to="/" replace />
  }
  return <>{children}</>
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/callback" element={<CallbackPage />} />
      <Route
        path="/app"
        element={
          <ProtectedRoute>
            <AppHome />
          </ProtectedRoute>
        }
      />
      <Route
        path="/app/discover"
        element={
          <ProtectedRoute>
            <DiscoverPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/app/builder"
        element={
          <ProtectedRoute>
            <BuilderPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/app/closet"
        element={
          <ProtectedRoute>
            <ClosetPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/app/wardrobe"
        element={
          <ProtectedRoute>
            <WardrobePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/app/wardrobe/add"
        element={
          <ProtectedRoute>
            <WardrobeAddPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/users"
        element={
          <ProtectedRoute>
            <AdminUsersPage />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
