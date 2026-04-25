import { useAuth0 } from '@auth0/auth0-react'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

import { ApiClient } from '../services/api'
import type { Outfit } from '../types'

const apiBase = import.meta.env.VITE_API_URL || 'http://127.0.0.1:5000'

type OutfitRow = {
  id: string
  name?: string | null
  created_at: string
  updated_at: string
  items: Outfit['items']
}

export function ClosetPage() {
  const { getAccessTokenSilently } = useAuth0()
  const api = useMemo(() => new ApiClient(apiBase, getAccessTokenSilently), [getAccessTokenSilently])
  const audience = import.meta.env.VITE_AUTH0_AUDIENCE

  const [rows, setRows] = useState<OutfitRow[]>([])
  const [err, setErr] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const run = async () => {
      setLoading(true)
      setErr(null)
      try {
        const data = await api.fetchJson<{ outfits: OutfitRow[] }>('/outfits', {}, audience)
        setRows(data.outfits)
      } catch (e) {
        setErr(e instanceof Error ? e.message : 'Failed to load outfits')
      } finally {
        setLoading(false)
      }
    }
    void run()
  }, [api, audience])

  return (
    <div className="min-h-dvh px-6 py-10">
      <div className="mx-auto max-w-5xl">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-widest text-violet-300/90">Closet</p>
            <h1 className="mt-2 font-display text-3xl text-white">Saved outfits</h1>
          </div>
          <div className="flex gap-2">
            <Link
              to="/app"
              className="rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-sm text-white hover:bg-white/10"
            >
              ← Home
            </Link>
            <Link
              to="/app/builder"
              className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-500"
            >
              Build →
            </Link>
          </div>
        </div>

        <div className="mt-8">
          {loading && <p className="text-sm text-zinc-400">Loading…</p>}
          {!loading && err && <p className="text-sm text-amber-200">{err}</p>}

          {!loading && !err && rows.length === 0 && (
            <div className="mt-10 rounded-2xl border border-white/10 bg-white/5 p-8 text-zinc-300">
              <p className="text-white">No saved outfits yet</p>
              <p className="mt-2 text-sm text-zinc-400">
                Go to Builder → Try‑On → swipe right to save.
              </p>
            </div>
          )}

          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {rows.map((o) => (
              <div key={o.id} className="rounded-2xl border border-white/10 bg-white/5 p-5">
                <p className="text-sm font-semibold text-white">{o.name || 'Outfit'}</p>
                <p className="mt-1 text-xs text-zinc-500">
                  Saved {new Date(o.updated_at).toLocaleString()}
                </p>
                <div className="mt-4 flex flex-wrap gap-2 text-xs text-zinc-300">
                  {o.items.map((i) => (
                    <span key={i.id} className="rounded-full border border-white/10 bg-black/20 px-2 py-1">
                      {i.category}: {i.name}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

