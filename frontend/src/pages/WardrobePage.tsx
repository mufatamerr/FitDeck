import { useAuth0 } from '@auth0/auth0-react'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { InnerNav } from '../components/InnerNav'
import { VintageVideoBackground } from '../components/VintageVideoBackground'
import { ApiClient } from '../services/api'
import type { ClothingItem } from '../types'

const apiBase   = import.meta.env.VITE_API_URL || 'http://127.0.0.1:5000'
const audience  = import.meta.env.VITE_AUTH0_AUDIENCE
const VIDEO_SRC = 'https://www.pexels.com/download/video/3753696/'

const fg    = '#ede9e3'
const muted = '#999'

const CATEGORY_EMOJI: Record<string, string> = {
  shirt: 'TOP', jacket: 'JACKET', pants: 'BOTTOMS', shoes: 'SHOES', accessory: 'ACC',
}

export function WardrobePage() {
  const navigate = useNavigate()
  const { getAccessTokenSilently } = useAuth0()
  const api = useMemo(() => new ApiClient(apiBase, getAccessTokenSilently), [getAccessTokenSilently])

  const [items, setItems]     = useState<ClothingItem[]>([])
  const [err, setErr]         = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter]   = useState<string>('all')
  const [deleting, setDeleting] = useState<Set<string>>(new Set())

  const deleteItem = async (id: string) => {
    setDeleting(prev => new Set(prev).add(id))
    try {
      await api.fetchJson<{ ok: boolean }>(`/wardrobe/${id}`, { method: 'DELETE' }, audience)
      setItems(prev => prev.filter(i => i.id !== id))
    } catch {
      // silently keep the card if delete fails
    } finally {
      setDeleting(prev => { const next = new Set(prev); next.delete(id); return next })
    }
  }

  const refresh = async () => {
    setLoading(true)
    setErr(null)
    try {
      const data = await api.fetchJson<{ items: ClothingItem[] }>('/wardrobe', {}, audience)
      setItems(data.items)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to load wardrobe')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void refresh() }, [])

  const categories = ['all', ...Array.from(new Set(items.map(i => i.category)))]
  const visible = filter === 'all' ? items : items.filter(i => i.category === filter)

  return (
    <div style={{ width: '100%', minHeight: '100vh', background: '#070707', color: fg, fontFamily: "'DM Sans',sans-serif", position: 'relative', overflowY: 'auto' }}>

      {/* VIDEO BG */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }}>
        <VintageVideoBackground src={VIDEO_SRC} opacity={0.55} />
      </div>
      <div style={{ position: 'fixed', inset: 0, zIndex: 1, pointerEvents: 'none', background: 'rgba(4,3,2,0.78)' }} />

      <div style={{ position: 'relative', zIndex: 10 }}>
        <InnerNav />

        <div style={{ padding: '52px 48px 80px' }}>

          {/* HEADER */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 48, flexWrap: 'wrap', gap: 24 }}>
            <div>
              <p style={{ fontSize: 9.5, letterSpacing: '0.32em', color: muted, marginBottom: 14 }}>MY WARDROBE</p>
              <h1 style={{ fontFamily: "'Cormorant Garamond',Georgia,serif", fontSize: 'clamp(44px,6vw,88px)', fontWeight: 300, lineHeight: 0.88, letterSpacing: '-0.025em', color: fg }}>
                Your<br /><em style={{ fontStyle: 'italic' }}>Pieces.</em>
              </h1>
              <p style={{ fontSize: 11.5, color: 'rgba(237,233,227,0.65)', marginTop: 18, letterSpacing: '0.05em', lineHeight: 1.85 }}>
                {items.length > 0 ? `${items.length} item${items.length !== 1 ? 's' : ''} in your wardrobe.` : 'Upload your first piece to get started.'}
              </p>
            </div>
            <button
              onClick={() => navigate('/app/wardrobe/add')}
              style={{ background: fg, color: '#070707', border: 'none', padding: '16px 40px', fontSize: 10, letterSpacing: '0.22em', fontFamily: "'DM Sans',sans-serif", cursor: 'pointer', fontWeight: 500 }}
            >
              ADD ITEM
            </button>
          </div>

          {/* CATEGORY FILTER */}
          {items.length > 0 && (
            <div style={{ display: 'flex', gap: 2, marginBottom: 36, flexWrap: 'wrap' }}>
              {categories.map(c => (
                <button
                  key={c}
                  onClick={() => setFilter(c)}
                  style={{
                    background: filter === c ? 'rgba(237,233,227,0.1)' : 'transparent',
                    border: `1px solid ${filter === c ? 'rgba(237,233,227,0.25)' : 'rgba(255,255,255,0.07)'}`,
                    color: filter === c ? fg : muted,
                    padding: '8px 20px', fontSize: 9, letterSpacing: '0.22em',
                    fontFamily: "'DM Sans',sans-serif", cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                >
                  {c === 'all' ? 'ALL' : (CATEGORY_EMOJI[c] ?? c.toUpperCase())}
                </button>
              ))}
            </div>
          )}

          {/* STATES */}
          {loading && (
            <p style={{ fontSize: 11, color: muted, letterSpacing: '0.1em', marginTop: 40 }}>Loading…</p>
          )}
          {!loading && err && (
            <div style={{ border: '1px solid rgba(139,32,32,0.3)', padding: '20px 24px', marginTop: 24 }}>
              <p style={{ fontSize: 11, color: '#8b4040' }}>{err}</p>
            </div>
          )}

          {/* EMPTY */}
          {!loading && !err && items.length === 0 && (
            <div style={{ marginTop: 60, maxWidth: 400 }}>
              <p style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 32, fontWeight: 300, color: 'rgba(237,233,227,0.6)', lineHeight: 1.2, letterSpacing: '-0.01em' }}>
                Your wardrobe<br />awaits its first piece.
              </p>
              <p style={{ fontSize: 11, color: muted, marginTop: 18, lineHeight: 1.9, letterSpacing: '0.04em' }}>
                Upload a clothing item and our AI will strip the background, creating a clean cutout ready for outfit building.
              </p>
              <button
                onClick={() => navigate('/app/wardrobe/add')}
                style={{ marginTop: 32, background: fg, color: '#070707', border: 'none', padding: '16px 40px', fontSize: 10, letterSpacing: '0.22em', fontFamily: "'DM Sans',sans-serif", cursor: 'pointer', fontWeight: 500 }}
              >
                ADD FIRST ITEM
              </button>
            </div>
          )}

          {/* GRID */}
          {!loading && !err && visible.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 1 }}>
              {visible.map(item => {
                const isDeleting = deleting.has(item.id)
                return (
                  <div
                    key={item.id}
                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', cursor: 'default', transition: 'border-color 0.2s, opacity 0.2s', opacity: isDeleting ? 0.4 : 1 }}
                    onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.18)')}
                    onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)')}
                  >
                    {/* IMAGE */}
                    <div style={{ aspectRatio: '3/4', background: 'rgba(0,0,0,0.3)', overflow: 'hidden', position: 'relative' }}>
                      {item.image_url
                        ? <img src={item.image_url} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'grayscale(0.2) contrast(1.04)' }} />
                        : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <span style={{ fontSize: 9, letterSpacing: '0.2em', color: '#666' }}>NO IMAGE</span>
                          </div>
                      }
                      <span style={{ position: 'absolute', top: 10, left: 10, fontSize: 8, letterSpacing: '0.18em', color: 'rgba(237,233,227,0.5)', background: 'rgba(0,0,0,0.55)', padding: '3px 8px' }}>
                        {CATEGORY_EMOJI[item.category] ?? item.category.toUpperCase()}
                      </span>
                    </div>

                    {/* META */}
                    <div style={{ padding: '16px 18px 12px' }}>
                      {item.brand && <p style={{ fontSize: 9, letterSpacing: '0.18em', color: muted, marginBottom: 6 }}>{item.brand.toUpperCase()}</p>}
                      <p style={{ fontSize: 13, color: fg, fontWeight: 300, lineHeight: 1.4, marginBottom: 14 }}>{item.name}</p>
                      <button
                        onClick={() => void deleteItem(item.id)}
                        disabled={isDeleting}
                        style={{
                          width: '100%',
                          background: 'transparent',
                          border: '1px solid rgba(239,68,68,0.22)',
                          color: '#f87171',
                          padding: '8px 0',
                          fontSize: 9,
                          letterSpacing: '0.18em',
                          fontFamily: "'DM Sans',sans-serif",
                          cursor: isDeleting ? 'not-allowed' : 'pointer',
                          opacity: isDeleting ? 0.5 : 1,
                          transition: 'all 0.15s',
                        }}
                      >
                        {isDeleting ? '…' : 'REMOVE'}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* REFRESH */}
          {!loading && items.length > 0 && (
            <button
              onClick={() => void refresh()}
              style={{ marginTop: 40, background: 'transparent', border: '1px solid rgba(255,255,255,0.08)', color: muted, padding: '11px 28px', fontSize: 9.5, letterSpacing: '0.2em', fontFamily: "'DM Sans',sans-serif", cursor: 'pointer' }}
            >
              REFRESH
            </button>
          )}

        </div>
      </div>
    </div>
  )
}
