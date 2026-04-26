import { useAuth0 } from '@auth0/auth0-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { removeBackground } from '@imgly/background-removal'
import { InnerNav } from '../components/InnerNav'
import { VintageVideoBackground } from '../components/VintageVideoBackground'

const apiBase   = import.meta.env.VITE_API_URL || 'http://127.0.0.1:5000'
const VIDEO_SRC = 'https://www.pexels.com/download/video/3753696/'
const fg        = '#ede9e3'
const muted     = '#999'

const CATEGORIES = ['shirt', 'jacket', 'pants', 'shoes', 'accessory']

export function WardrobeAddPage() {
  const navigate = useNavigate()
  const { getAccessTokenSilently } = useAuth0()

  const [file, setFile]           = useState<File | null>(null)
  const [tryOnAsset, setTryOnAsset] = useState<Blob | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [name, setName]           = useState('')
  const [brand, setBrand]         = useState('')
  const [category, setCategory]   = useState('shirt')
  const [loading, setLoading]     = useState(false)
  const [bgRemoving, setBgRemoving] = useState(false)
  const [err, setErr]             = useState<string | null>(null)
  const [done, setDone]           = useState(false)

  const onPick = async (picked: File | null) => {
    setFile(picked)
    setTryOnAsset(null)
    setPreviewUrl(null)
    setErr(null)
    if (!picked) return
    setBgRemoving(true)
    try {
      const blob = await removeBackground(picked)
      setTryOnAsset(blob)
      setPreviewUrl(URL.createObjectURL(blob))
    } catch {
      setPreviewUrl(URL.createObjectURL(picked))
    } finally {
      setBgRemoving(false)
    }
  }

  const upload = async () => {
    if (!file) return
    setLoading(true)
    setErr(null)
    try {
      const audience = import.meta.env.VITE_AUTH0_AUDIENCE
      const token = await getAccessTokenSilently(
        audience ? { authorizationParams: { audience } } : undefined,
      )
      const form = new FormData()
      form.append('image', file)
      if (tryOnAsset) form.append('try_on_asset', new File([tryOnAsset], 'tryon.png', { type: 'image/png' }))
      if (name)     form.append('name', name)
      if (brand)    form.append('brand', brand)
      if (category) form.append('category', category)

      const res  = await fetch(`${apiBase}/wardrobe/upload`, {
        method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: form,
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.detail || data?.error || `HTTP ${res.status}`)
      setDone(true)
      setTimeout(() => navigate('/app/wardrobe'), 900)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Upload failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ width: '100%', minHeight: '100vh', background: '#070707', color: fg, fontFamily: "'DM Sans',sans-serif", position: 'relative', overflowY: 'auto' }}>

      {/* VIDEO BG */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }}>
        <VintageVideoBackground src={VIDEO_SRC} opacity={0.45} />
      </div>
      <div style={{ position: 'fixed', inset: 0, zIndex: 1, pointerEvents: 'none', background: 'rgba(4,3,2,0.85)' }} />

      <div style={{ position: 'relative', zIndex: 10 }}>
        <InnerNav />

        <div style={{ padding: '52px 48px 80px', maxWidth: 560 }}>

          {/* HEADER */}
          <div style={{ marginBottom: 48 }}>
            <p style={{ fontSize: 9.5, letterSpacing: '0.32em', color: muted, marginBottom: 14 }}>MY WARDROBE</p>
            <h1 style={{ fontFamily: "'Cormorant Garamond',Georgia,serif", fontSize: 'clamp(42px,5vw,72px)', fontWeight: 300, lineHeight: 0.9, letterSpacing: '-0.025em', color: fg }}>
              Add<br /><em style={{ fontStyle: 'italic' }}>a Piece.</em>
            </h1>
          </div>

          <div style={{ border: '1px solid rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.02)', padding: '32px 32px 36px', display: 'flex', flexDirection: 'column', gap: 24 }}>

            {/* FILE PICK */}
            <div>
              <p style={{ fontSize: 9, letterSpacing: '0.22em', color: muted, marginBottom: 12 }}>PHOTO</p>
              <label style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: '1px dashed rgba(255,255,255,0.12)', padding: '28px 20px',
                cursor: 'pointer', color: muted, fontSize: 10, letterSpacing: '0.18em',
                transition: 'border-color 0.2s',
              }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.25)')}
                onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)')}
              >
                <input
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={e => void onPick(e.target.files?.[0] ?? null)}
                />
                {file ? file.name : 'CHOOSE FILE'}
              </label>
              {bgRemoving && (
                <p style={{ fontSize: 9.5, color: muted, marginTop: 10, letterSpacing: '0.1em' }}>Removing background…</p>
              )}
            </div>

            {/* PREVIEW */}
            {previewUrl && (
              <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                <div style={{ width: 120, background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.07)', overflow: 'hidden' }}>
                  <img src={previewUrl} alt="preview" style={{ width: '100%', display: 'block' }} />
                </div>
                <div>
                  <p style={{ fontSize: 9, letterSpacing: '0.18em', color: muted, marginBottom: 6 }}>PREVIEW</p>
                  {tryOnAsset
                    ? <p style={{ fontSize: 11, color: 'rgba(237,233,227,0.5)', lineHeight: 1.7 }}>Background removed.<br />Ready for try-on.</p>
                    : <p style={{ fontSize: 11, color: muted, lineHeight: 1.7 }}>Original image.</p>
                  }
                </div>
              </div>
            )}

            {/* FIELDS */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              {[
                { label: 'ITEM NAME', value: name, setter: setName, placeholder: 'e.g. Black denim jacket', type: 'text' as const },
                { label: 'BRAND', value: brand, setter: setBrand, placeholder: 'e.g. Acne Studios', type: 'text' as const },
              ].map(f => (
                <div key={f.label}>
                  <p style={{ fontSize: 9, letterSpacing: '0.22em', color: muted, marginBottom: 8 }}>{f.label}</p>
                  <input
                    type={f.type}
                    value={f.value}
                    onChange={e => f.setter(e.target.value)}
                    placeholder={f.placeholder}
                    style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.09)', color: fg, padding: '12px 16px', fontSize: 12, fontFamily: "'DM Sans',sans-serif", outline: 'none' }}
                    onFocus={e => (e.target.style.borderColor = 'rgba(255,255,255,0.22)')}
                    onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.09)')}
                  />
                </div>
              ))}

              <div>
                <p style={{ fontSize: 9, letterSpacing: '0.22em', color: muted, marginBottom: 8 }}>CATEGORY</p>
                <div style={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                  {CATEGORIES.map(c => (
                    <button
                      key={c}
                      onClick={() => setCategory(c)}
                      style={{
                        background: category === c ? 'rgba(237,233,227,0.1)' : 'transparent',
                        border: `1px solid ${category === c ? 'rgba(237,233,227,0.3)' : 'rgba(255,255,255,0.07)'}`,
                        color: category === c ? fg : muted,
                        padding: '8px 16px', fontSize: 9, letterSpacing: '0.18em',
                        fontFamily: "'DM Sans',sans-serif", cursor: 'pointer', transition: 'all 0.15s',
                      }}
                    >
                      {c.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {err && <p style={{ fontSize: 10.5, color: '#8b4040', letterSpacing: '0.04em' }}>{err}</p>}
            {done && <p style={{ fontSize: 10.5, color: 'rgba(237,233,227,0.6)', letterSpacing: '0.1em' }}>Saved — returning to wardrobe…</p>}

            <button
              onClick={() => void upload()}
              disabled={!file || loading || bgRemoving}
              style={{
                background: (!file || loading || bgRemoving) ? 'rgba(255,255,255,0.05)' : fg,
                color: (!file || loading || bgRemoving) ? '#2a2a2a' : '#070707',
                border: 'none', padding: '18px 0',
                fontSize: 10, letterSpacing: '0.24em', fontFamily: "'DM Sans',sans-serif",
                cursor: (!file || loading || bgRemoving) ? 'default' : 'pointer', fontWeight: 500,
                transition: 'all 0.2s',
              }}
            >
              {loading ? 'UPLOADING…' : bgRemoving ? 'PROCESSING…' : tryOnAsset ? 'UPLOAD WITH TRY-ON ASSET' : 'UPLOAD'}
            </button>

          </div>
        </div>
      </div>
    </div>
  )
}
