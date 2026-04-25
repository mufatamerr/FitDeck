import { useAuth0 } from '@auth0/auth0-react'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

import { ApiClient } from '../services/api'
import type { ClothingItem } from '../types'

const apiBase = import.meta.env.VITE_API_URL || 'http://127.0.0.1:5000'

export function DiscoverPage() {
  const { getAccessTokenSilently, user, logout } = useAuth0()
  const [items, setItems] = useState<ClothingItem[]>([])
  const [err, setErr] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const api = useMemo(() => new ApiClient(apiBase, getAccessTokenSilently), [getAccessTokenSilently])

  useEffect(() => {
    const run = async () => {
      setLoading(true)
      setErr(null)
      try {
        const audience = import.meta.env.VITE_AUTH0_AUDIENCE
        const data = await api.fetchJson<{ items: ClothingItem[] }>('/catalog?limit=30', {}, audience)
        setItems(data.items)
      } catch (e) {
        setErr(e instanceof Error ? e.message : 'Failed to load catalog')
      } finally {
        setLoading(false)
      }
    }
    void run()
  }, [api])

  return (
    <div className="min-h-dvh px-6 py-10">
      <div className="mx-auto max-w-5xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-widest text-violet-300/90">Discover</p>
            <h1 className="mt-2 font-display text-3xl text-white">Catalog</h1>
            <p className="mt-2 text-sm text-zinc-400">{user?.email}</p>
          </div>
          <div className="flex gap-2">
            <Link
              to="/app"
              className="rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-sm text-white hover:bg-white/10"
            >
              ← Home
            </Link>
            <button
              type="button"
              onClick={() => logout({ logoutParams: { returnTo: window.location.origin } })}
              className="rounded-lg bg-white/10 px-4 py-2 text-sm text-white hover:bg-white/15"
            >
              Log out
            </button>
          </div>
        </div>

        <div className="mt-8">
          {loading && <p className="text-sm text-zinc-400">Loading…</p>}
          {!loading && err && <p className="text-sm text-amber-200">{err}</p>}

          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((i) => (
              <div
                key={i.id}
                className="overflow-hidden rounded-2xl border border-white/10 bg-white/5 shadow-2xl backdrop-blur"
              >
                <div className="aspect-square w-full bg-black/20">
                  {i.image_url ? (
                    <img src={i.image_url} alt={i.name} className="h-full w-full object-cover" />
                  ) : null}
                </div>
                <div className="p-4">
                  <p className="text-xs text-zinc-500">{i.brand || '—'}</p>
                  <p className="mt-1 text-sm font-medium text-white">{i.name}</p>
                  <div className="mt-2 flex flex-wrap gap-2 text-xs text-zinc-400">
                    <span className="rounded-full border border-white/10 bg-black/20 px-2 py-1">
                      {i.category}
                    </span>
                    {(i.style_tags || []).slice(0, 2).map((t) => (
                      <span key={t} className="rounded-full border border-white/10 bg-black/20 px-2 py-1">
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

