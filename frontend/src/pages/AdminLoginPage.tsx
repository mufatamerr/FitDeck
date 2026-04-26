import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

const API = import.meta.env.VITE_API_URL || 'http://127.0.0.1:5000'

export function AdminLoginPage() {
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)

  const fg = '#ede9e3'
  const bg = '#070707'

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`${API}/dev-admin/login`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ username, password }),
      })
      const data = await res.json().catch(() => ({})) as { token?: string; error?: string }
      if (!res.ok) { setError(data.error || 'Invalid credentials'); return }
      sessionStorage.setItem('admin_token', data.token!)
      navigate('/admin-dashboard')
    } catch {
      setError('Could not reach the server.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ width: '100%', minHeight: '100vh', background: bg, display: 'flex', flexDirection: 'column', position: 'relative', fontFamily: "'DM Sans',sans-serif" }}>

      <nav style={{ padding: '26px 44px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button onClick={() => navigate('/')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, letterSpacing: '0.22em', color: fg, fontFamily: 'inherit', fontWeight: 500, padding: 0 }}>
          FITDECK
        </button>
        <span style={{ fontSize: 9, letterSpacing: '0.28em', color: '#333' }}>ADMIN ACCESS</span>
      </nav>

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <form onSubmit={(e) => void handleLogin(e)} style={{ width: '100%', maxWidth: 360, padding: '0 24px', animation: 'fadeUp 0.75s ease forwards' }}>

          <h2 style={{ fontFamily: "'Cormorant Garamond',Georgia,serif", fontSize: 42, fontWeight: 300, color: fg, letterSpacing: '-0.01em', lineHeight: 1.05 }}>
            Admin<br /><em>access.</em>
          </h2>
          <p style={{ fontSize: 11, letterSpacing: '0.1em', color: '#383838', marginTop: 10, marginBottom: 46 }}>
            Development dashboard login.
          </p>

          <input
            type="text"
            placeholder="USERNAME"
            value={username}
            onChange={e => setUsername(e.target.value)}
            className="input-underline"
            autoComplete="username"
          />
          <input
            type="password"
            placeholder="PASSWORD"
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="input-underline"
            style={{ marginTop: 20 }}
            autoComplete="current-password"
          />

          {error && (
            <p style={{ fontSize: 10, color: '#8b2020', marginTop: 16, letterSpacing: '0.06em' }}>{error}</p>
          )}

          <button type="submit" className="btn-primary" disabled={loading || !username || !password}>
            {loading ? 'Signing in…' : 'Enter'}
          </button>

          <p style={{ fontSize: 9.5, color: '#272727', marginTop: 28, letterSpacing: '0.04em', lineHeight: 1.8 }}>
            Default: <span style={{ color: '#333' }}>admin / fitdeck2026</span>
          </p>
        </form>
      </div>

      <div style={{ padding: '22px 44px', display: 'flex', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 8.5, letterSpacing: '0.2em', color: '#1a1a1a' }}>© FITDECK MMXXVI</span>
        <span style={{ fontSize: 8.5, letterSpacing: '0.2em', color: '#1a1a1a' }}>ADMIN PANEL</span>
      </div>
    </div>
  )
}
