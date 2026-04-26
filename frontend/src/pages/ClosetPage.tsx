import { useAuth0 } from '@auth0/auth0-react'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { InnerNav } from '../components/InnerNav'
import { VintageVideoBackground } from '../components/VintageVideoBackground'
import { ApiClient } from '../services/api'
import type { Outfit } from '../types'

const apiBase   = import.meta.env.VITE_API_URL || 'http://127.0.0.1:5000'
const audience  = import.meta.env.VITE_AUTH0_AUDIENCE
const VIDEO_SRC = 'https://www.pexels.com/download/video/8346468/'

const fg    = '#ede9e3'
const muted = '#999'

type OutfitRow = {
  id: string
  name?: string | null
  created_at: string
  updated_at: string
  items: Outfit['items']
}

export function ClosetPage() {
  const navigate = useNavigate()
  const { getAccessTokenSilently } = useAuth0()
  const api = useMemo(() => new ApiClient(apiBase, getAccessTokenSilently), [getAccessTokenSilently])

  const [rows, setRows]         = useState<OutfitRow[]>([])
  const [err, setErr]           = useState<string | null>(null)
  const [loading, setLoading]   = useState(true)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [deleting, setDeleting] = useState<Set<string>>(new Set())

  const toggleSelect = (id: string) =>
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })

  const deleteOutfit = async (id: string) => {
    setDeleting(prev => new Set(prev).add(id))
    try {
      await api.fetchJson<{ ok: boolean }>(`/outfits/${id}`, { method: 'DELETE' }, audience)
      setRows(prev => prev.filter(r => r.id !== id))
      setSelected(prev => { const next = new Set(prev); next.delete(id); return next })
    } catch {
      // silently keep the card if delete fails
    } finally {
      setDeleting(prev => { const next = new Set(prev); next.delete(id); return next })
    }
  }

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
  }, [api])

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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 48, flexWrap: 'wrap', gap: 24 }}>
            <div>
              <p style={{ fontSize: 9.5, letterSpacing: '0.32em', color: muted, marginBottom: 14 }}>MY CLOSET</p>
              <h1 style={{ fontFamily: "'Cormorant Garamond',Georgia,serif", fontSize: 'clamp(44px,6vw,88px)', fontWeight: 300, lineHeight: 0.88, letterSpacing: '-0.025em', color: fg }}>
                Saved<br /><em style={{ fontStyle: 'italic' }}>Fits.</em>
              </h1>
              <p style={{ fontSize: 11.5, color: 'rgba(237,233,227,0.65)', marginTop: 18, letterSpacing: '0.05em', lineHeight: 1.85, maxWidth: 300 }}>
                Outfits you swiped right on in the try-on experience.
              </p>
            </div>
            <button
              onClick={() => navigate('/app/builder')}
              style={{ background: 'transparent', color: fg, border: '1px solid rgba(255,255,255,0.18)', padding: '15px 36px', fontSize: 10, letterSpacing: '0.22em', fontFamily: "'DM Sans',sans-serif", cursor: 'pointer' }}
            >
              BUILD NEW FIT
            </button>
          </div>

          {loading && <p style={{ fontSize: 11, color: muted, letterSpacing: '0.1em' }}>Loading…</p>}
          {!loading && err && (
            <div style={{ border: '1px solid rgba(139,32,32,0.3)', padding: '20px 24px' }}>
              <p style={{ fontSize: 11, color: '#8b4040' }}>{err}</p>
            </div>
          )}

          {/* EMPTY */}
          {!loading && !err && rows.length === 0 && (
            <div style={{ marginTop: 60, maxWidth: 400 }}>
              <p style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 32, fontWeight: 300, color: 'rgba(237,233,227,0.55)', lineHeight: 1.2 }}>
                No saved outfits yet.
              </p>
              <p style={{ fontSize: 11, color: muted, marginTop: 18, lineHeight: 1.9, letterSpacing: '0.04em', maxWidth: 300 }}>
                Build a fit in the Builder, then hit Try On and swipe right to save it here.
              </p>
              <button
                onClick={() => navigate('/app/builder')}
                style={{ marginTop: 32, background: fg, color: '#070707', border: 'none', padding: '16px 40px', fontSize: 10, letterSpacing: '0.22em', fontFamily: "'DM Sans',sans-serif", cursor: 'pointer', fontWeight: 500 }}
              >
                GO TO BUILDER
              </button>
            </div>
          )}

          {/* OUTFIT GRID */}
          {!loading && !err && rows.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 1 }}>
              {rows.map(outfit => {
                const isSelected = selected.has(outfit.id)
                const isDeleting = deleting.has(outfit.id)
                return (
                  <div
                    key={outfit.id}
                    style={{
                      background: isSelected ? 'rgba(139,92,246,0.08)' : 'rgba(255,255,255,0.03)',
                      border: `1px solid ${isSelected ? 'rgba(139,92,246,0.45)' : 'rgba(255,255,255,0.07)'}`,
                      padding: '28px 26px',
                      transition: 'border-color 0.2s, background 0.2s',
                      cursor: 'default',
                      opacity: isDeleting ? 0.4 : 1,
                    }}
                  >
                    {/* Thumbnail strip */}
                    <div style={{ display: 'flex', gap: 1, marginBottom: 20, height: 72 }}>
                      {outfit.items.slice(0, 4).map(item => (
                        <div key={item.id} style={{ flex: 1, background: 'rgba(0,0,0,0.4)', overflow: 'hidden' }}>
                          {item.image_url
                            ? <img src={item.image_url} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'grayscale(0.3)' }} />
                            : <div style={{ width: '100%', height: '100%', background: 'rgba(255,255,255,0.02)' }} />
                          }
                        </div>
                      ))}
                      {outfit.items.length === 0 && (
                        <div style={{ flex: 1, background: 'rgba(255,255,255,0.02)' }} />
                      )}
                    </div>

                    <p style={{ fontSize: 14, color: fg, fontWeight: 300, marginBottom: 6 }}>
                      {outfit.name || 'Outfit'}
                    </p>
                    <p style={{ fontSize: 9, letterSpacing: '0.14em', color: muted, marginBottom: 16 }}>
                      {new Date(outfit.updated_at).toLocaleDateString('en-CA')}
                    </p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, marginBottom: 20 }}>
                      {outfit.items.map(item => (
                        <span
                          key={item.id}
                          style={{ fontSize: 8.5, letterSpacing: '0.12em', color: '#aaa', border: '1px solid #333', padding: '3px 8px' }}
                        >
                          {item.name}
                        </span>
                      ))}
                    </div>

                    {/* Actions */}
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        onClick={() => toggleSelect(outfit.id)}
                        style={{
                          flex: 1,
                          background: isSelected ? 'rgba(139,92,246,0.25)' : 'transparent',
                          border: `1px solid ${isSelected ? 'rgba(139,92,246,0.6)' : 'rgba(255,255,255,0.12)'}`,
                          color: isSelected ? '#c4b5fd' : muted,
                          padding: '9px 0',
                          fontSize: 9,
                          letterSpacing: '0.18em',
                          fontFamily: "'DM Sans',sans-serif",
                          cursor: 'pointer',
                          transition: 'all 0.15s',
                        }}
                      >
                        {isSelected ? 'SELECTED' : 'SELECT'}
                      </button>
                      <button
                        onClick={() => void deleteOutfit(outfit.id)}
                        disabled={isDeleting}
                        style={{
                          flex: 1,
                          background: 'transparent',
                          border: '1px solid rgba(239,68,68,0.22)',
                          color: '#f87171',
                          padding: '9px 0',
                          fontSize: 9,
                          letterSpacing: '0.18em',
                          fontFamily: "'DM Sans',sans-serif",
                          cursor: isDeleting ? 'not-allowed' : 'pointer',
                          opacity: isDeleting ? 0.5 : 1,
                          transition: 'all 0.15s',
                        }}
                      >
                        {isDeleting ? '…' : 'DELETE'}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
