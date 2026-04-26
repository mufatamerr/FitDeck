import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useFitAuth } from '../auth/FitAuth'

const API = import.meta.env.VITE_API_URL || 'http://127.0.0.1:5000'

export function AdminLoginPage() {
  const navigate  = useNavigate()
  const { loginWithRedirect, isConfigured } = useFitAuth()

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
      navigate('/admin')
    } catch {
      setError('Could not reach the server.')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogle = async () => {
    await loginWithRedirect({
      appState: { returnTo: '/admin' },
      authorizationParams: { connection: 'google-oauth2', prompt: 'login' },
    })
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
        <div style={{ width: '100%', maxWidth: 360, padding: '0 24px', animation: 'fadeUp 0.75s ease forwards' }}>

          <h2 style={{ fontFamily: "'Cormorant Garamond',Georgia,serif", fontSize: 42, fontWeight: 300, color: fg, letterSpacing: '-0.01em', lineHeight: 1.05 }}>
            Admin<br /><em>access.</em>
          </h2>
          <p style={{ fontSize: 11, letterSpacing: '0.1em', color: '#555', marginTop: 10, marginBottom: 40 }}>
            Sign in to the FitDeck admin panel.
          </p>

          {/* Google sign-in */}
          {isConfigured && (
            <>
              <button
                type="button"
                onClick={() => void handleGoogle()}
                style={{
                  width: '100%', background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  color: fg, padding: '14px 0', fontSize: 10.5,
                  letterSpacing: '0.18em', fontFamily: "'DM Sans',sans-serif",
                  cursor: 'pointer', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', gap: 10, transition: 'background 0.2s',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.09)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                CONTINUE WITH GOOGLE
              </button>

              <div style={{ display: 'flex', alignItems: 'center', gap: 16, margin: '24px 0' }}>
                <div style={{ flex: 1, height: 1, background: '#191919' }} />
                <span style={{ fontSize: 9.5, letterSpacing: '0.15em', color: '#333' }}>OR</span>
                <div style={{ flex: 1, height: 1, background: '#191919' }} />
              </div>
            </>
          )}

          {/* Username / password */}
          <form onSubmit={(e) => void handleLogin(e)}>
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
          </form>

          <p style={{ fontSize: 9.5, color: '#2a2a2a', marginTop: 28, letterSpacing: '0.04em', lineHeight: 1.8 }}>
            Default: <span style={{ color: '#444' }}>admin / fitdeck2026</span>
          </p>
        </div>
      </div>

      <div style={{ padding: '22px 44px', display: 'flex', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 8.5, letterSpacing: '0.2em', color: '#1a1a1a' }}>© FITDECK MMXXVI</span>
        <span style={{ fontSize: 8.5, letterSpacing: '0.2em', color: '#1a1a1a' }}>ADMIN PANEL</span>
      </div>
    </div>
  )
}
