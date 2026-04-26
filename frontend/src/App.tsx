import type { ReactNode } from 'react'
import { useEffect, useState } from 'react'
import { Navigate, Outlet, Route, Routes } from 'react-router-dom'
import { useFitAuth } from './auth/FitAuth'
import { FitBotDock } from './components/fitbot/FitBotDock'
import { AppHome } from './pages/AppHome'
import { CallbackPage } from './pages/CallbackPage'
import { DiscoverPage } from './pages/DiscoverPage'
import { LandingPage } from './pages/LandingPage'
import { SignInPage } from './pages/SignInPage'
import { SignUpPage } from './pages/SignUpPage'
import { WardrobeAddPage } from './pages/WardrobeAddPage'
import { WardrobePage } from './pages/WardrobePage'
import { AdminUsersPage } from './pages/AdminUsersPage'
import { AdminCatalogPage } from './pages/AdminCatalogPage'
import { AdminOverviewPage } from './pages/AdminOverviewPage'
import { AdminShell } from './components/admin/AdminShell'
import { BuilderPage } from './pages/BuilderPage'
import { ClosetPage } from './pages/ClosetPage'
import { AdminLoginPage } from './pages/AdminLoginPage'
import { AdminDashboard } from './pages/AdminDashboard'

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, isConfigured, isLoading } = useFitAuth()

  if (isLoading) {
    return (
      <div className="flex min-h-dvh items-center justify-center text-zinc-400">
        Loading…
      </div>
    )
  }
  if (!isConfigured) {
    return <>{children}</>
  }
  if (!isAuthenticated) {
    return <Navigate to="/" replace />
  }
  return <>{children}</>
}

function AdminRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, isConfigured, isLoading, getAccessTokenSilently } = useFitAuth()
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null)

  useEffect(() => {
    if (!isAuthenticated || !isConfigured) return
    const check = async () => {
      try {
        const token = await getAccessTokenSilently({
          authorizationParams: { audience: import.meta.env.VITE_AUTH0_AUDIENCE },
        })
        const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
        const payload = JSON.parse(atob(base64)) as Record<string, unknown>
        setIsAdmin(payload['role'] === 'admin')
      } catch {
        setIsAdmin(false)
      }
    }
    void check()
  }, [isAuthenticated, isConfigured, getAccessTokenSilently])

  if (isLoading || (isAuthenticated && isConfigured && isAdmin === null)) {
    return <div className="flex min-h-dvh items-center justify-center text-zinc-400">Loading…</div>
  }
  if (!isConfigured) return <>{children}</>
  if (!isAuthenticated) return <Navigate to="/" replace />
  if (!isAdmin) return <Navigate to="/app" replace />
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
      <Route path="/signup" element={<SignUpPage />} />
      <Route path="/signin" element={<SignInPage />} />
      <Route path="/callback" element={<CallbackPage />} />
      <Route path="/admin-login" element={<AdminLoginPage />} />
      <Route path="/admin-dashboard" element={<AdminDashboard />} />
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
      </Route>
      <Route
        element={
          <AdminRoute>
            <AdminShell />
          </AdminRoute>
        }
      >
        <Route path="/admin" element={<AdminOverviewPage />} />
        <Route path="/admin/users" element={<AdminUsersPage />} />
        <Route path="/admin/catalog" element={<AdminCatalogPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
