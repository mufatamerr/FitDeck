import { useAuth0 } from '@auth0/auth0-react'
import { useEffect, useMemo, useState } from 'react'
import { InnerNav } from '../components/InnerNav'
import { VintageVideoBackground } from '../components/VintageVideoBackground'
import { TryOnModal } from '../components/tryon/TryOnModal'
import { ApiClient } from '../services/api'
import { useOutfitStore } from '../store/outfitStore'
import type { ClothingCategory, ClothingItem, Outfit } from '../types'

const apiBase   = import.meta.env.VITE_API_URL || 'http://127.0.0.1:5000'
const audience  = import.meta.env.VITE_AUTH0_AUDIENCE
const VIDEO_SRC = 'https://www.pexels.com/download/video/9558222/'

const fg    = '#ede9e3'
const muted = '#999'

const CATEGORIES: ClothingCategory[] = ['shirt', 'jacket', 'pants', 'shoes']
const CAT_LABELS: Record<ClothingCategory, string> = {
  shirt: 'TOP', jacket: 'JACKET', pants: 'BOTTOMS', shoes: 'SHOES', accessory: 'ACC',
}

export function BuilderPage() {
  const { getAccessTokenSilently } = useAuth0()
  const api = useMemo(() => new ApiClient(apiBase, getAccessTokenSilently), [getAccessTokenSilently])

  const { currentOutfit, setItem, removeCategory, clear } = useOutfitStore()

  const [activeCategory, setActiveCategory] = useState<ClothingCategory>('shirt')
  const [catalog, setCatalog]               = useState<ClothingItem[]>([])
  const [wardrobe, setWardrobe]             = useState<ClothingItem[]>([])
  const [sourceTab, setSourceTab]           = useState<'catalog' | 'wardrobe'>('catalog')
  const [loading, setLoading]               = useState(true)
  const [err, setErr]                       = useState<string | null>(null)
  const [tryOnOpen, setTryOnOpen]           = useState(false)
  const [queue, setQueue]                   = useState<Outfit[]>([])

  useEffect(() => {
    const run = async () => {
      setLoading(true)
      setErr(null)
      try {
        const [cat, wr] = await Promise.all([
          api.fetchJson<{ items: ClothingItem[] }>('/catalog?limit=200', {}, audience),
          api.fetchJson<{ items: ClothingItem[] }>('/wardrobe', {}, audience),
        ])
        setCatalog(cat.items)
        setWardrobe(wr.items)
      } catch (e) {
        setErr(e instanceof Error ? e.message : 'Failed to load items')
      } finally {
        setLoading(false)
      }
    }
    void run()
  }, [api])

  const pool = sourceTab === 'catalog' ? catalog : wardrobe
  const itemsForCategory = pool.filter(i => i.category === activeCategory)
  const selectedByCategory = (cat: ClothingCategory) => currentOutfit.items.find(i => i.category === cat)

  const openTryOn = () => {
    const base: Outfit = { id: 'builder', name: 'My Fit', items: currentOutfit.items }
    const noJacket: Outfit = { ...base, id: 'builder-2', name: 'No jacket', items: base.items.filter(i => i.category !== 'jacket') }
    const allItems = [...catalog, ...wardrobe]
    const altPants = allItems.find(i => i.category === 'pants' && !base.items.some(x => x.id === i.id))
    const alt: Outfit | null = altPants
      ? { ...base, id: 'builder-3', name: 'Alt pants', items: [...base.items.filter(i => i.category !== 'pants'), altPants] }
      : null
    setQueue([base, noJacket, ...(alt ? [alt] : [])].filter(o => o.items.length > 0))
    setTryOnOpen(true)
  }

  const saveOutfit = async (outfit: Outfit) => {
    const created = await api.fetchJson<{ outfit_id: string }>(
      '/outfits',
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: outfit.name || 'Saved outfit', item_ids: outfit.items.map(i => i.id) }) },
      audience,
    )
    await api.fetchJson('/swipe', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ outfit_id: created.outfit_id, direction: 'right' }) }, audience)
  }

  const outfitComplete = currentOutfit.items.length > 0

  return (
    <div style={{ width: '100%', minHeight: '100vh', background: '#070707', color: fg, fontFamily: "'DM Sans',sans-serif", position: 'relative', overflowY: 'auto' }}>

      {/* VIDEO BG */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }}>
        <VintageVideoBackground src={VIDEO_SRC} opacity={0.48} />
      </div>
      <div style={{ position: 'fixed', inset: 0, zIndex: 1, pointerEvents: 'none', background: 'rgba(4,3,2,0.84)' }} />

      <div style={{ position: 'relative', zIndex: 10 }}>
        <InnerNav />

        <div style={{ padding: '52px 48px 80px' }}>

          {/* HEADER */}
          <div style={{ marginBottom: 48 }}>
            <p style={{ fontSize: 9.5, letterSpacing: '0.32em', color: muted, marginBottom: 14 }}>OUTFIT BUILDER</p>
            <h1 style={{ fontFamily: "'Cormorant Garamond',Georgia,serif", fontSize: 'clamp(44px,6vw,88px)', fontWeight: 300, lineHeight: 0.88, letterSpacing: '-0.025em', color: fg }}>
              Build<br /><em style={{ fontStyle: 'italic' }}>the Fit.</em>
            </h1>
            <p style={{ fontSize: 11.5, color: 'rgba(237,233,227,0.65)', marginTop: 18, letterSpacing: '0.05em', lineHeight: 1.85, maxWidth: 340 }}>
              Pull from the catalog or your wardrobe. Build your look, then try it on.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 1, alignItems: 'start' }}>

            {/* ── LEFT PANEL: ITEM BROWSER ── */}
            <div style={{ border: '1px solid rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.02)' }}>

              {/* SOURCE TABS */}
              <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                {(['catalog', 'wardrobe'] as const).map(s => (
                  <button
                    key={s}
                    onClick={() => setSourceTab(s)}
                    style={{
                      flex: 1, padding: '16px 0',
                      background: sourceTab === s ? 'rgba(237,233,227,0.05)' : 'transparent',
                      border: 'none', borderBottom: sourceTab === s ? `1px solid ${fg}` : '1px solid transparent',
                      color: sourceTab === s ? fg : muted,
                      fontSize: 9.5, letterSpacing: '0.22em', fontFamily: "'DM Sans',sans-serif", cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                  >
                    {s === 'catalog' ? 'CATALOG' : 'MY WARDROBE'}
                  </button>
                ))}
              </div>

              {/* CATEGORY TABS */}
              <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid rgba(255,255,255,0.07)', padding: '0 24px' }}>
                {CATEGORIES.map(c => (
                  <button
                    key={c}
                    onClick={() => setActiveCategory(c)}
                    style={{
                      padding: '14px 16px', background: 'none',
                      border: 'none', borderBottom: activeCategory === c ? `1px solid ${fg}` : '1px solid transparent',
                      color: activeCategory === c ? fg : muted,
                      fontSize: 9, letterSpacing: '0.22em', fontFamily: "'DM Sans',sans-serif", cursor: 'pointer',
                      marginBottom: -1,
                    }}
                  >
                    {CAT_LABELS[c]}
                  </button>
                ))}
              </div>

              {/* ITEMS */}
              <div style={{ padding: '20px 24px 28px' }}>
                {loading && <p style={{ fontSize: 11, color: muted, letterSpacing: '0.1em' }}>Loading…</p>}
                {!loading && err && <p style={{ fontSize: 11, color: '#8b4040' }}>{err}</p>}
                {!loading && !err && itemsForCategory.length === 0 && (
                  <p style={{ fontSize: 11, color: muted, letterSpacing: '0.04em', padding: '20px 0' }}>
                    No {activeCategory} items in {sourceTab === 'catalog' ? 'the catalog' : 'your wardrobe'}.
                  </p>
                )}
                {!loading && !err && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 1, marginTop: 4 }}>
                    {itemsForCategory.map(item => {
                      const selected = selectedByCategory(activeCategory)?.id === item.id
                      return (
                        <button
                          key={item.id}
                          onClick={() => setItem(item)}
                          style={{
                            background: selected ? 'rgba(237,233,227,0.07)' : 'rgba(255,255,255,0.02)',
                            border: `1px solid ${selected ? 'rgba(237,233,227,0.3)' : 'rgba(255,255,255,0.06)'}`,
                            cursor: 'pointer', textAlign: 'left', padding: 0,
                            transition: 'all 0.15s',
                          }}
                          onMouseEnter={e => { if (!selected) e.currentTarget.style.borderColor = 'rgba(255,255,255,0.18)' }}
                          onMouseLeave={e => { if (!selected) e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)' }}
                        >
                          <div style={{ aspectRatio: '3/4', background: 'rgba(0,0,0,0.3)', overflow: 'hidden' }}>
                            {item.image_url
                              ? <img src={item.image_url} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                  <span style={{ fontSize: 8, color: '#666', letterSpacing: '0.1em' }}>NO IMG</span>
                                </div>
                            }
                          </div>
                          <div style={{ padding: '10px 12px' }}>
                            {item.brand && <p style={{ fontSize: 8, letterSpacing: '0.14em', color: muted, marginBottom: 4 }}>{item.brand.toUpperCase()}</p>}
                            <p style={{ fontSize: 11, color: fg, fontWeight: 300, lineHeight: 1.3 }}>{item.name}</p>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* ── RIGHT PANEL: CURRENT OUTFIT ── */}
            <div style={{ border: '1px solid rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.02)', position: 'sticky', top: 80 }}>
              <div style={{ padding: '24px 24px 8px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                <p style={{ fontSize: 9, letterSpacing: '0.28em', color: muted }}>CURRENT FIT</p>
              </div>

              <div style={{ padding: '20px 24px' }}>
                {CATEGORIES.map(c => {
                  const sel = selectedByCategory(c)
                  return (
                    <div
                      key={c}
                      style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                    >
                      {/* thumb */}
                      <div style={{ width: 44, height: 56, background: 'rgba(0,0,0,0.4)', flexShrink: 0, overflow: 'hidden' }}>
                        {sel?.image_url && <img src={sel.image_url} alt={sel.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 8, letterSpacing: '0.18em', color: muted, marginBottom: 4 }}>{CAT_LABELS[c]}</p>
                        <p style={{ fontSize: 11.5, color: sel ? fg : '#666', fontWeight: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {sel ? sel.name : 'None selected'}
                        </p>
                      </div>
                      {sel && (
                        <button
                          onClick={() => removeCategory(c)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#3a3a3a', fontSize: 18, lineHeight: 1, padding: '0 4px' }}
                          title="Remove"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>

              <div style={{ padding: '16px 24px 28px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                {/* TRY ON — primary action */}
                <button
                  onClick={openTryOn}
                  disabled={!outfitComplete}
                  style={{
                    background: outfitComplete ? fg : 'rgba(255,255,255,0.05)',
                    color: outfitComplete ? '#070707' : '#2a2a2a',
                    border: 'none', padding: '18px 0',
                    fontSize: 10, letterSpacing: '0.24em', fontFamily: "'DM Sans',sans-serif",
                    cursor: outfitComplete ? 'pointer' : 'default', fontWeight: 500,
                    transition: 'all 0.2s',
                  }}
                >
                  TRY ON
                </button>
                <button
                  onClick={clear}
                  style={{ background: 'transparent', color: muted, border: '1px solid rgba(255,255,255,0.07)', padding: '12px 0', fontSize: 9.5, letterSpacing: '0.2em', fontFamily: "'DM Sans',sans-serif", cursor: 'pointer' }}
                >
                  CLEAR
                </button>
                {!outfitComplete && (
                  <p style={{ fontSize: 9.5, color: '#2a2a2a', textAlign: 'center', marginTop: 6, letterSpacing: '0.04em', lineHeight: 1.7 }}>
                    Select at least one item to try on
                  </p>
                )}
                {outfitComplete && (
                  <p style={{ fontSize: 9.5, color: muted, textAlign: 'center', marginTop: 6, letterSpacing: '0.04em', lineHeight: 1.7 }}>
                    Save the generated look in try-on to add it to your closet
                  </p>
                )}
              </div>
            </div>

          </div>
        </div>
      </div>

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
