import { useAuth0 } from '@auth0/auth0-react'
import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

import { ApiClient } from '../services/api'
import { TryOnModal } from '../components/tryon/TryOnModal'
import type { Outfit } from '../types'
const apiBase = import.meta.env.VITE_API_URL || 'http://127.0.0.1:5000'

export function AppHome() {
  const { user, logout, getAccessTokenSilently } = useAuth0()
  const [sync, setSync] = useState<Record<string, unknown> | null>(null)
  const [syncError, setSyncError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [tryOnOpen, setTryOnOpen] = useState(false)

  const runSync = useCallback(async () => {
    setLoading(true)
    setSyncError(null)
    try {
      const audience = import.meta.env.VITE_AUTH0_AUDIENCE
      const api = new ApiClient(apiBase, getAccessTokenSilently)
      const data = await api.fetchJson<Record<string, unknown>>(
        '/auth/sync',
        { method: 'POST' },
        audience,
      )
      setSync(data)
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

  const demoQueue: Outfit[] = [
    {
      id: 'demo-1',
      name: 'Demo outfit 1',
      items: [
        {
          id: 'shirt-1',
          name: 'Demo shirt',
          brand: 'FitDeck',
          category: 'shirt',
          try_on_asset: 'https://dummyimage.com/600x600/7c3aed/ffffff.png&text=SHIRT',
        },
        {
          id: 'pants-1',
          name: 'Demo pants',
          brand: 'FitDeck',
          category: 'pants',
          try_on_asset: 'https://dummyimage.com/600x600/111827/ffffff.png&text=PANTS',
        },
      ],
    },
    {
      id: 'demo-2',
      name: 'Demo outfit 2',
      items: [
        {
          id: 'jacket-1',
          name: 'Demo jacket',
          brand: 'FitDeck',
          category: 'jacket',
          try_on_asset: 'https://dummyimage.com/600x600/0ea5e9/ffffff.png&text=JACKET',
        },
        {
          id: 'pants-2',
          name: 'Demo pants',
          brand: 'FitDeck',
          category: 'pants',
          try_on_asset: 'https://dummyimage.com/600x600/111827/ffffff.png&text=PANTS',
        },
        {
          id: 'shoes-1',
          name: 'Demo shoes',
          brand: 'FitDeck',
          category: 'shoes',
          try_on_asset: 'https://dummyimage.com/600x600/f59e0b/111827.png&text=SHOES',
        },
      ],
    },
  ]

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
            onClick={() => setTryOnOpen(true)}
            className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-500"
          >
            Open Try-On (demo)
          </button>
          <Link
            to="/app/discover"
            className="rounded-lg border border-white/20 bg-white/5 px-4 py-2 text-sm text-white hover:bg-white/10"
          >
            Discover →
          </Link>
          <Link
            to="/app/builder"
            className="rounded-lg border border-white/20 bg-white/5 px-4 py-2 text-sm text-white hover:bg-white/10"
          >
            Builder →
          </Link>
          <Link
            to="/app/closet"
            className="rounded-lg border border-white/20 bg-white/5 px-4 py-2 text-sm text-white hover:bg-white/10"
          >
            Closet →
          </Link>
          <Link
            to="/app/wardrobe"
            className="rounded-lg border border-white/20 bg-white/5 px-4 py-2 text-sm text-white hover:bg-white/10"
          >
            My Wardrobe →
          </Link>
          <Link
            to="/admin/users"
            className="rounded-lg border border-white/20 bg-white/5 px-4 py-2 text-sm text-white hover:bg-white/10"
          >
            Admin Users →
          </Link>
          <Link
            to="/admin/catalog"
            className="rounded-lg border border-white/20 bg-white/5 px-4 py-2 text-sm text-white hover:bg-white/10"
          >
            Admin Catalog →
          </Link>
          <button
            type="button"
            onClick={() => void runSync()}
            className="rounded-lg border border-white/20 px-4 py-2 text-sm text-white hover:bg-white/5"
          >
            Retry sync
          </button>
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

      {tryOnOpen && (
        <TryOnModal
          outfitQueue={demoQueue}
          onClose={() => setTryOnOpen(false)}
          onSaveOutfit={async () => {
            const audience = import.meta.env.VITE_AUTH0_AUDIENCE
            const api = new ApiClient(apiBase, getAccessTokenSilently)
            const outfitId = await api.fetchJson<{ outfit_id: string }>(
              '/outfits',
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  name: 'Saved from Try-On',
                  item_ids: [],
                }),
              },
              audience,
            )

            await api.fetchJson<{ ok: boolean }>(
              '/swipe',
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ outfit_id: outfitId.outfit_id, direction: 'right' }),
              },
              audience,
            )
          }}
        />
      )}

    </div>
  )
}
