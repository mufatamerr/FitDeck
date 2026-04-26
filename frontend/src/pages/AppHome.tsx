import { useAuth0 } from '@auth0/auth0-react'
import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

const apiBase = import.meta.env.VITE_API_URL || 'http://127.0.0.1:5000'

export function AppHome() {
  const { user, logout, getAccessTokenSilently } = useAuth0()
  const [sync, setSync] = useState<Record<string, unknown> | null>(null)
  const [syncError, setSyncError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const runSync = useCallback(async () => {
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
  }, [getAccessTokenSilently])

  useEffect(() => {
    void runSync()
  }, [runSync])

  return (
    <div className="min-h-dvh px-6 py-12">
      <div className="mx-auto max-w-xl rounded-2xl border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur-md">
        <p className="text-xs font-medium uppercase tracking-widest text-violet-300/90">
          Authenticated
        </p>
        <h1 className="mt-2 font-display text-3xl text-white">
          Welcome{user?.name ? `, ${user.name}` : ''}
        </h1>
        <p className="mt-2 text-sm text-zinc-400">{user?.email}</p>

        <div className="mt-8 rounded-xl border border-white/10 bg-black/30 p-4 text-left">
          <p className="text-xs uppercase tracking-wider text-zinc-500">
            POST /auth/sync (JWT validated on Flask)
          </p>
          {loading && <p className="mt-2 text-sm text-zinc-400">Calling API…</p>}
          {!loading && syncError && (
            <p className="mt-2 text-sm text-amber-200">
              {syncError}
              <span className="mt-2 block text-xs text-zinc-500">
                Ensure the Flask backend is running and root <code>.env</code> has{' '}
                <code>AUTH0_DOMAIN</code> and <code>AUTH0_AUDIENCE</code> matching this
                app&apos;s API identifier.
              </span>
            </p>
          )}
          {!loading && sync && (
            <pre className="mt-3 overflow-x-auto text-xs text-emerald-200/90">
              {JSON.stringify(sync, null, 2)}
            </pre>
          )}
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => void runSync()}
            className="rounded-lg border border-white/20 px-4 py-2 text-sm text-white hover:bg-white/5"
          >
            Retry sync
          </button>
          <Link
            to="/app/fitbot-test"
            className="rounded-lg border border-white/20 bg-white/5 px-4 py-2 text-sm text-white hover:bg-white/10"
          >
            FitBot test →
          </Link>
          <Link
            to="/app/video-tryon"
            className="rounded-lg border border-white/20 bg-white/5 px-4 py-2 text-sm text-white hover:bg-white/10"
          >
            Video try-on →
          </Link>
          <button
            type="button"
            onClick={() =>
              logout({ logoutParams: { returnTo: window.location.origin } })
            }
            className="rounded-lg bg-white/10 px-4 py-2 text-sm text-white hover:bg-white/15"
          >
            Log out
          </button>
          <Link
            to="/"
            className="inline-flex items-center rounded-lg px-4 py-2 text-sm text-zinc-400 hover:text-white"
          >
            ← Home
          </Link>
        </div>
      </div>
    </div>
  )
}
