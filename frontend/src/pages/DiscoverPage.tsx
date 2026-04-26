import { useAuth0 } from '@auth0/auth0-react'
import { useEffect, useMemo, useState } from 'react'
import { InnerNav } from '../components/InnerNav'
import { VintageVideoBackground } from '../components/VintageVideoBackground'
import { ApiClient } from '../services/api'
import type { ClothingItem } from '../types'

const apiBase   = import.meta.env.VITE_API_URL || 'http://127.0.0.1:5000'
const audience  = import.meta.env.VITE_AUTH0_AUDIENCE
const VIDEO_SRC = 'https://www.pexels.com/download/video/9594848/'

const fg    = '#ede9e3'
const muted = '#999'

export function DiscoverPage() {
  const { getAccessTokenSilently } = useAuth0()
  const api = useMemo(() => new ApiClient(apiBase, getAccessTokenSilently), [getAccessTokenSilently])

  const [items, setItems]     = useState<ClothingItem[]>([])
  const [err, setErr]         = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter]   = useState<string>('all')
  const [search, setSearch]   = useState('')

  useEffect(() => {
    const run = async () => {
      setLoading(true)
      setErr(null)
      try {
        const data = await api.fetchJson<{ items: ClothingItem[] }>('/catalog?limit=60', {}, audience)
        setItems(data.items)
      } catch (e) {
        setErr(e instanceof Error ? e.message : 'Failed to load catalog')
      } finally {
        setLoading(false)
      }
    }
    void run()
  }, [api])

  const categories = ['all', ...Array.from(new Set(items.map(i => i.category)))]
  const visible = items.filter(i => {
    const matchesCat = filter === 'all' || i.category === filter
    const q = search.toLowerCase()
    const matchesSearch = !q || i.name.toLowerCase().includes(q) || (i.brand ?? '').toLowerCase().includes(q)
    return matchesCat && matchesSearch
  })

  return (
    <div style={{ width: '100%', minHeight: '100vh', background: '#070707', color: fg, fontFamily: "'DM Sans',sans-serif", position: 'relative', overflowY: 'auto' }}>

      {/* VIDEO BG */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }}>
        <VintageVideoBackground src={VIDEO_SRC} opacity={0.5} />
      </div>
      <div style={{ position: 'fixed', inset: 0, zIndex: 1, pointerEvents: 'none', background: 'rgba(4,3,2,0.82)' }} />

      <div style={{ position: 'relative', zIndex: 10 }}>
        <InnerNav />

        <div style={{ padding: '52px 48px 80px' }}>

          {/* HEADER */}
          <div style={{ marginBottom: 48 }}>
            <p style={{ fontSize: 9.5, letterSpacing: '0.32em', color: muted, marginBottom: 14 }}>CATALOG</p>
            <h1 style={{ fontFamily: "'Cormorant Garamond',Georgia,serif", fontSize: 'clamp(44px,6vw,88px)', fontWeight: 300, lineHeight: 0.88, letterSpacing: '-0.025em', color: fg }}>
              The<br /><em style={{ fontStyle: 'italic' }}>Archive.</em>
            </h1>
            <p style={{ fontSize: 11.5, color: 'rgba(237,233,227,0.65)', marginTop: 18, letterSpacing: '0.05em', lineHeight: 1.85, maxWidth: 320 }}>
              Every piece in the FitDeck database. Browse, filter, add to your builder.
            </p>
          </div>

          {/* SEARCH + FILTERS */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 36, flexWrap: 'wrap', alignItems: 'center' }}>
            <input
              type="text"
              placeholder="SEARCH ITEMS…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: fg,
                padding: '10px 18px',
                fontSize: 10,
                letterSpacing: '0.18em',
                fontFamily: "'DM Sans',sans-serif",
                outline: 'none',
                width: 220,
              }}
            />
            <div style={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              {categories.map(c => (
                <button
                  key={c}
                  onClick={() => setFilter(c)}
                  style={{
                    background: filter === c ? 'rgba(237,233,227,0.1)' : 'transparent',
                    border: `1px solid ${filter === c ? 'rgba(237,233,227,0.25)' : 'rgba(255,255,255,0.07)'}`,
                    color: filter === c ? fg : muted,
                    padding: '8px 18px', fontSize: 9, letterSpacing: '0.22em',
                    fontFamily: "'DM Sans',sans-serif", cursor: 'pointer', transition: 'all 0.2s',
                  }}
                >
                  {c.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {/* COUNT */}
          {!loading && (
            <p style={{ fontSize: 9, letterSpacing: '0.2em', color: '#777', marginBottom: 24 }}>
              {visible.length} {visible.length === 1 ? 'ITEM' : 'ITEMS'}
            </p>
          )}

          {loading && <p style={{ fontSize: 11, color: muted, letterSpacing: '0.1em' }}>Loading…</p>}
          {!loading && err && (
            <div style={{ border: '1px solid rgba(139,32,32,0.3)', padding: '20px 24px' }}>
              <p style={{ fontSize: 11, color: '#8b4040' }}>{err}</p>
            </div>
          )}

          {/* EMPTY CATALOG */}
          {!loading && !err && items.length === 0 && (
            <div style={{ marginTop: 60, maxWidth: 360 }}>
              <p style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 32, fontWeight: 300, color: 'rgba(237,233,227,0.55)', lineHeight: 1.2 }}>
                The archive is empty.
              </p>
              <p style={{ fontSize: 11, color: muted, marginTop: 16, lineHeight: 1.9, letterSpacing: '0.04em' }}>
                Catalog items are seeded by admins. Check back soon.
              </p>
            </div>
          )}

          {/* GRID */}
          {!loading && !err && visible.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 1 }}>
              {visible.map(item => (
                <div
                  key={item.id}
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', transition: 'border-color 0.2s', cursor: 'default' }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)')}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)')}
                >
                  <div style={{ aspectRatio: '3/4', background: 'rgba(0,0,0,0.3)', overflow: 'hidden', position: 'relative' }}>
                    {item.image_url
                      ? <img src={item.image_url} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'grayscale(0.15) contrast(1.06)' }} />
                      : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <span style={{ fontSize: 9, letterSpacing: '0.2em', color: '#666' }}>NO IMAGE</span>
                        </div>
                    }
                    {item.source === 'personal' && (
                      <span style={{ position: 'absolute', top: 10, right: 10, fontSize: 8, letterSpacing: '0.14em', color: 'rgba(237,233,227,0.5)', background: 'rgba(0,0,0,0.6)', padding: '3px 8px' }}>
                        YOURS
                      </span>
                    )}
                  </div>
                  <div style={{ padding: '16px 18px' }}>
                    {item.brand && <p style={{ fontSize: 9, letterSpacing: '0.18em', color: muted, marginBottom: 6 }}>{item.brand.toUpperCase()}</p>}
                    <p style={{ fontSize: 13, color: fg, fontWeight: 300, lineHeight: 1.4, marginBottom: 8 }}>{item.name}</p>
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      {(item.style_tags ?? []).slice(0, 2).map(t => (
                        <span key={t} style={{ fontSize: 8, letterSpacing: '0.14em', color: '#888', border: '1px solid #333', padding: '2px 6px' }}>
                          {t.toUpperCase()}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
