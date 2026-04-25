import { useAuth0 } from '@auth0/auth0-react'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

import { ApiClient } from '../services/api'
import type { ClothingItem } from '../types'

const apiBase = import.meta.env.VITE_API_URL || 'http://127.0.0.1:5000'

export function WardrobePage() {
  const { getAccessTokenSilently } = useAuth0()
  const api = useMemo(() => new ApiClient(apiBase, getAccessTokenSilently), [getAccessTokenSilently])

  const [items, setItems] = useState<ClothingItem[]>([])
  const [err, setErr] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = async () => {
    setLoading(true)
    setErr(null)
    try {
      const audience = import.meta.env.VITE_AUTH0_AUDIENCE
      const data = await api.fetchJson<{ items: ClothingItem[] }>('/wardrobe', {}, audience)
      setItems(data.items)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void refresh()
  }, [])

  return (
    <div className="min-h-dvh px-6 py-10">
      <div className="mx-auto max-w-5xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-widest text-violet-300/90">My Wardrobe</p>
            <h1 className="mt-2 font-display text-3xl text-white">Uploads</h1>
          </div>
          <div className="flex gap-2">
            <Link
              to="/app"
              className="rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-sm text-white hover:bg-white/10"
            >
              ← Home
            </Link>
            <Link
              to="/app/wardrobe/add"
              className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-500"
            >
              Add item
            </Link>
          </div>
        </div>

        <div className="mt-8">
          {loading && <p className="text-sm text-zinc-400">Loading…</p>}
          {!loading && err && <p className="text-sm text-amber-200">{err}</p>}

          {!loading && !err && items.length === 0 && (
            <div className="mt-10 rounded-2xl border border-white/10 bg-white/5 p-8 text-zinc-300">
              <p className="text-white">No items yet</p>
              <p className="mt-2 text-sm text-zinc-400">
                Add your first item. If you set <code>GOOGLE_CLOUD_VISION_API_KEY</code>, the backend will suggest tags.
              </p>
            </div>
          )}

          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((i) => (
              <div
                key={i.id}
                className="overflow-hidden rounded-2xl border border-white/10 bg-white/5 shadow-2xl backdrop-blur"
              >
                <div className="aspect-square w-full bg-black/20" />
                <div className="p-4">
                  <p className="text-xs text-zinc-500">{i.brand || '—'}</p>
                  <p className="mt-1 text-sm font-medium text-white">{i.name}</p>
                  <p className="mt-2 text-xs text-zinc-400">{i.category}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={() => void refresh()}
          className="mt-8 rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-sm text-white hover:bg-white/10"
        >
          Refresh
        </button>
      </div>
    </div>
  )
}

