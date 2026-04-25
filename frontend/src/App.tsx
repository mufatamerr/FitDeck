import { useAuth0 } from '@auth0/auth0-react'
import type { ReactNode } from 'react'
import { Navigate, Outlet, Route, Routes } from 'react-router-dom'
import { FitBotDock } from './components/fitbot/FitBotDock'
import { AppHome } from './pages/AppHome'
import { CallbackPage } from './pages/CallbackPage'
import { DiscoverPage } from './pages/DiscoverPage'
import { LandingPage } from './pages/LandingPage'
import { WardrobeAddPage } from './pages/WardrobeAddPage'
import { WardrobePage } from './pages/WardrobePage'
import { AdminUsersPage } from './pages/AdminUsersPage'
import { AdminCatalogPage } from './pages/AdminCatalogPage'
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

function AuthedShell() {
  return (
    <>
      <Outlet />
      <FitBotDock />
    </>
  )
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/callback" element={<CallbackPage />} />
      <Route
        element={
          <ProtectedRoute>
            <AuthedShell />
          </ProtectedRoute>
        }
      >
        <Route path="/app" element={<AppHome />} />
        <Route path="/app/discover" element={<DiscoverPage />} />
        <Route path="/app/builder" element={<BuilderPage />} />
        <Route path="/app/closet" element={<ClosetPage />} />
        <Route path="/app/wardrobe" element={<WardrobePage />} />
        <Route path="/app/wardrobe/add" element={<WardrobeAddPage />} />
        <Route path="/admin/users" element={<AdminUsersPage />} />
        <Route path="/admin/catalog" element={<AdminCatalogPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
