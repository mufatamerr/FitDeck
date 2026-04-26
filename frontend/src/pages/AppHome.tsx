import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useFitAuth } from '../auth/FitAuth'
import { SiteHeader } from '../components/SiteHeader'

const apiBase = import.meta.env.VITE_API_URL || 'http://127.0.0.1:5000'

export function AppHome() {
  const { user, logout, getAccessTokenSilently, isAuthenticated, isConfigured } =
    useFitAuth()
  const [sync, setSync] = useState<Record<string, unknown> | null>(null)
  const [syncError, setSyncError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const runSync = useCallback(async () => {
    if (!isConfigured || !isAuthenticated) {
      setSync({
        preview: true,
        message: 'Auth0 is not configured yet. This app screen is running in frontend preview mode.',
      })
      setSyncError(null)
      setLoading(false)
      return
    }

    setLoading(true)
    setSyncError(null)
    try {
      const audience = import.meta.env.VITE_AUTH0_AUDIENCE
      const token = await getAccessTokenSilently({
        authorizationParams: audience ? { audience } : undefined,
      })
      const res = await fetch(`${apiBase}/auth/sync`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setSync(null)
        setSyncError(
          typeof data.detail === 'string'
            ? data.detail
            : data.error || `HTTP ${res.status}`,
        )
        return
      }
      setSync(data as Record<string, unknown>)
    } catch (e) {
      setSync(null)
      setSyncError(e instanceof Error ? e.message : 'Sync failed')
    } finally {
      setLoading(false)
    }
  }, [getAccessTokenSilently, isAuthenticated, isConfigured])

  useEffect(() => {
    void runSync()
  }, [runSync])

  return (
    <main className="pb-20">
      <SiteHeader />

      <section className="page-shell grid gap-6 px-6 pb-8 pt-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
        <div className="glass-panel px-6 py-8 sm:px-8">
          <p className="section-kicker">Authenticated app shell</p>
          <h1 className="mt-4 font-display text-5xl leading-none text-white sm:text-6xl">
            Welcome{user?.name ? `, ${user.name}` : ''}.
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-zinc-300 sm:text-lg">
            This protected screen now matches the rest of the runway theme, while still
            keeping the backend JWT sync check visible for your group.
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <article className="dashboard-mini-card">
              <p className="dashboard-mini-card__label">Profile</p>
              <p className="dashboard-mini-card__value">
                {user?.email ?? (isConfigured ? 'No email found' : 'Preview mode')}
              </p>
            </article>
            <article className="dashboard-mini-card">
              <p className="dashboard-mini-card__label">Auth status</p>
              <p className="dashboard-mini-card__value">
                {!isConfigured
                  ? 'Preview mode'
                  : loading
                    ? 'Checking token'
                    : syncError
                      ? 'Needs attention'
                      : 'Connected'}
              </p>
            </article>
            <article className="dashboard-mini-card">
              <p className="dashboard-mini-card__label">Next module</p>
              <p className="dashboard-mini-card__value">Catalog + Try-On</p>
            </article>
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <button type="button" onClick={() => void runSync()} className="button-primary">
              Refresh sync
            </button>
            <Link to="/" className="button-secondary">
              Return home
            </Link>
            <button
              type="button"
              onClick={() =>
                logout({ logoutParams: { returnTo: window.location.origin } })
              }
              className="button-ghost"
            >
              Log out
            </button>
          </div>
        </div>

        <aside className="glass-panel px-6 py-8">
          <p className="section-kicker">Runway map</p>
          <div className="mt-4 space-y-4 text-sm leading-6 text-zinc-300">
            <p>
              `1.` Upload a full-body image and start the try-on flow.
            </p>
            <p>
              `2.` Swipe through outfits and keep the same red-carpet presentation.
            </p>
            <p>
              `3.` Hand the result to FitBot for restyling and voice feedback.
            </p>
          </div>
        </aside>
      </section>

      <section className="page-shell px-6">
        <div className="glass-panel px-6 py-8 sm:px-8">
          <p className="section-kicker">Backend verification</p>
          <h2 className="mt-3 font-display text-4xl text-white">`POST /auth/sync`</h2>
          {loading && <p className="mt-4 text-sm text-zinc-400">Calling API…</p>}
          {!loading && syncError && (
            <div className="status-panel mt-5">
              <p className="text-sm text-amber-100">{syncError}</p>
              <p className="mt-2 text-xs leading-5 text-zinc-400">
                Ensure the Flask backend is running and root `.env` has `AUTH0_DOMAIN`
                and `AUTH0_AUDIENCE` matching this app&apos;s API identifier.
              </p>
            </div>
          )}
          {!loading && sync && (
            <pre className="status-panel mt-5 overflow-x-auto text-xs text-emerald-100">
              {JSON.stringify(sync, null, 2)}
            </pre>
          )}
        </div>
      </section>
    </main>
  )
}
