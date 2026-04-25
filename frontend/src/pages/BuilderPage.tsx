import { useAuth0 } from '@auth0/auth0-react'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

import { FitBotButton } from '../components/fitbot/FitBotButton'
import { TryOnModal } from '../components/tryon/TryOnModal'
import { ApiClient } from '../services/api'
import { useOutfitStore } from '../store/outfitStore'
import type { ClothingCategory, ClothingItem, Outfit } from '../types'

const apiBase = import.meta.env.VITE_API_URL || 'http://127.0.0.1:5000'

const categories: ClothingCategory[] = ['shirt', 'jacket', 'pants', 'shoes']

export function BuilderPage() {
  const { getAccessTokenSilently } = useAuth0()
  const api = useMemo(() => new ApiClient(apiBase, getAccessTokenSilently), [getAccessTokenSilently])
  const audience = import.meta.env.VITE_AUTH0_AUDIENCE

  const { currentOutfit, setItem, removeCategory, clear } = useOutfitStore()

  const [activeCategory, setActiveCategory] = useState<ClothingCategory>('shirt')
  const [catalog, setCatalog] = useState<ClothingItem[]>([])
  const [wardrobe, setWardrobe] = useState<ClothingItem[]>([])
  const [sourceTab, setSourceTab] = useState<'catalog' | 'wardrobe'>('catalog')
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)
  const [tryOnOpen, setTryOnOpen] = useState(false)
  const [queue, setQueue] = useState<Outfit[]>([])

  useEffect(() => {
    const run = async () => {
      setLoading(true)
      setErr(null)
      try {
        const [cat, wr] = await Promise.all([
          api.fetchJson<{ items: ClothingItem[] }>(`/catalog?limit=200`, {}, audience),
          api.fetchJson<{ items: ClothingItem[] }>(`/wardrobe`, {}, audience),
        ])
        setCatalog(cat.items)
        setWardrobe(wr.items)
      } catch (e) {
        setErr(e instanceof Error ? e.message : 'Failed to load catalog')
      } finally {
        setLoading(false)
      }
    }
    void run()
  }, [api, audience])

  const itemsForCategory = (sourceTab === 'catalog' ? catalog : wardrobe).filter(
    (i) => i.category === activeCategory,
  )

  const selectedByCategory = (cat: ClothingCategory) =>
    currentOutfit.items.find((i) => i.category === cat)

  const openTryOn = () => {
    const base: Outfit = {
      id: 'builder',
      name: 'My Fit',
      items: currentOutfit.items,
    }
    // simple variations: remove jacket, swap pants if available
    const noJacket: Outfit = {
      ...base,
      id: 'builder-2',
      name: 'No jacket',
      items: base.items.filter((i) => i.category !== 'jacket'),
    }
    const pool = [...catalog, ...wardrobe]
    const altPants = pool.find(
      (i) => i.category === 'pants' && !base.items.some((x) => x.id === i.id),
    )
    const alt: Outfit | null = altPants
      ? {
          ...base,
          id: 'builder-3',
          name: 'Alt pants',
          items: [
            ...base.items.filter((i) => i.category !== 'pants'),
            altPants,
          ],
        }
      : null

    const q = [base, noJacket, ...(alt ? [alt] : [])].filter((o) => o.items.length > 0)
    setQueue(q)
    setTryOnOpen(true)
  }

  const saveOutfit = async (outfit: Outfit) => {
    const itemIds = outfit.items.map((i) => i.id)
    const created = await api.fetchJson<{ outfit_id: string }>(
      '/outfits',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: outfit.name || 'Saved outfit', item_ids: itemIds }),
      },
      audience,
    )
    await api.fetchJson<{ ok: boolean }>(
      '/swipe',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ outfit_id: created.outfit_id, direction: 'right' }),
      },
      audience,
    )
  }

  return (
    <div className="min-h-dvh px-6 py-10">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-widest text-violet-300/90">Outfit Builder</p>
            <h1 className="mt-2 font-display text-3xl text-white">Build a fit</h1>
          </div>
          <div className="flex gap-2">
            <Link
              to="/app"
              className="rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-sm text-white hover:bg-white/10"
            >
              ← Home
            </Link>
            <Link
              to="/app/closet"
              className="rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-sm text-white hover:bg-white/10"
            >
              Closet →
            </Link>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <div className="flex flex-wrap gap-2">
              {categories.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setActiveCategory(c)}
                  className={[
                    'rounded-full px-4 py-2 text-sm',
                    activeCategory === c
                      ? 'bg-violet-600 text-white'
                      : 'border border-white/10 bg-black/20 text-zinc-200 hover:bg-black/30',
                  ].join(' ')}
                >
                  {c}
                </button>
              ))}
            </div>

            <div className="mt-6">
              {loading && <p className="text-sm text-zinc-400">Loading…</p>}
              {!loading && err && <p className="text-sm text-amber-200">{err}</p>}

              <div className="mt-4 flex gap-2">
                <button
                  type="button"
                  onClick={() => setSourceTab('catalog')}
                  className={[
                    'rounded-full px-4 py-2 text-sm',
                    sourceTab === 'catalog'
                      ? 'bg-white/10 text-white'
                      : 'border border-white/10 bg-black/20 text-zinc-300 hover:bg-black/30',
                  ].join(' ')}
                >
                  Brand Catalog
                </button>
                <button
                  type="button"
                  onClick={() => setSourceTab('wardrobe')}
                  className={[
                    'rounded-full px-4 py-2 text-sm',
                    sourceTab === 'wardrobe'
                      ? 'bg-white/10 text-white'
                      : 'border border-white/10 bg-black/20 text-zinc-300 hover:bg-black/30',
                  ].join(' ')}
                >
                  My Wardrobe
                </button>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {itemsForCategory.map((i) => {
                  const selected = selectedByCategory(activeCategory)?.id === i.id
                  return (
                    <button
                      key={i.id}
                      type="button"
                      onClick={() => setItem(i)}
                      className={[
                        'overflow-hidden rounded-2xl border text-left',
                        selected ? 'border-violet-400 bg-violet-500/10' : 'border-white/10 bg-white/5',
                      ].join(' ')}
                    >
                      <div className="aspect-square w-full bg-black/20">
                        {i.image_url ? (
                          <img src={i.image_url} alt={i.name} className="h-full w-full object-cover" />
                        ) : null}
                      </div>
                      <div className="p-3">
                        <p className="truncate text-xs text-zinc-400">{i.brand || '—'}</p>
                        <p className="mt-1 line-clamp-2 text-sm font-medium text-white">{i.name}</p>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <p className="text-xs uppercase tracking-widest text-zinc-400">Your outfit</p>
            <div className="mt-4 space-y-3">
              {categories.map((c) => {
                const sel = selectedByCategory(c)
                return (
                  <div key={c} className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/20 px-4 py-3">
                    <div className="min-w-0">
                      <p className="text-xs text-zinc-500">{c}</p>
                      <p className="truncate text-sm text-white">{sel ? sel.name : '—'}</p>
                    </div>
                    {sel ? (
                      <button
                        type="button"
                        onClick={() => removeCategory(c)}
                        className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-zinc-200 hover:bg-white/10"
                      >
                        Remove
                      </button>
                    ) : null}
                  </div>
                )
              })}
            </div>

            <div className="mt-6 flex gap-2">
              <button
                type="button"
                onClick={openTryOn}
                disabled={currentOutfit.items.length === 0}
                className="flex-1 rounded-xl bg-violet-600 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"
              >
                Try On
              </button>
              <button
                type="button"
                onClick={clear}
                className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white hover:bg-white/10"
              >
                Clear
              </button>
            </div>

            <p className="mt-3 text-xs text-zinc-500">
              Tip: swipe right in Try‑On to save to your closet.
            </p>
          </div>
        </div>
      </div>

      <FitBotButton />

      {tryOnOpen && (
        <TryOnModal
          outfitQueue={queue}
          onClose={() => setTryOnOpen(false)}
          onSaveOutfit={saveOutfit}
        />
      )}
    </div>
  )
}

