import { useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { DottedSurface } from '@/components/ui/dotted-surface'
import { SplineSceneBasic } from '@/components/ui/demo'
import { useFitAuth } from '../auth/FitAuth'

export function SignUpPage() {
  const { isAuthenticated, isConfigured, isLoading, loginWithRedirect } = useFitAuth()
  const [username, setUsername] = useState('')
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')

  if (isConfigured && isAuthenticated) return <Navigate to="/app" replace />

  const savePending = () => {
    if (username.trim()) localStorage.setItem('fitdeck_pending_username', username.trim())
  }

  const goEmail = async () => {
    savePending()
    await loginWithRedirect({
      appState: { returnTo: '/app' },
      authorizationParams: { screen_hint: 'signup', login_hint: email || undefined },
    })
  }

  const goGoogle = async () => {
    savePending()
    await loginWithRedirect({
      appState: { returnTo: '/app' },
      authorizationParams: { connection: 'google-oauth2', screen_hint: 'signup', login_hint: email || undefined },
    })
  }

  const bg  = '#070707'
  const fg  = '#ede9e3'

  return (
    <div style={{ width: '100%', minHeight: '100vh', background: bg, display: 'flex', flexDirection: 'column', position: 'relative', fontFamily: "'DM Sans',sans-serif" }}>
      <DottedSurface className="opacity-80" />
      <nav style={{ padding: '26px 44px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative', zIndex: 2 }}>
        <Link to="/" style={{ fontSize: 13, letterSpacing: '0.22em', color: fg, fontFamily: 'inherit', fontWeight: 500 }}>
          FITDECK
        </Link>
        <Link to="/signin" style={{ fontSize: 10.5, letterSpacing: '0.2em', color: '#555', fontFamily: "'DM Sans',sans-serif" }}>
          SIGN IN
        </Link>
      </nav>

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', zIndex: 1 }}>
        <div className="w-full px-6 lg:grid lg:max-w-[1400px] lg:grid-cols-[minmax(320px,360px)_minmax(0,1fr)] lg:items-center lg:gap-10 lg:px-10">
          <div style={{ width: '100%', maxWidth: 360, animation: 'fadeUp 0.75s ease forwards' }}>
            <h2 style={{ fontFamily: "'Cormorant Garamond',Georgia,serif", fontSize: 42, fontWeight: 300, color: fg, letterSpacing: '-0.01em', lineHeight: 1.05 }}>
              Create<br /><em>account.</em>
            </h2>

            <input
              type="text"
              placeholder="USERNAME"
              value={username}
              onChange={e => setUsername(e.target.value)}
              className="input-underline"
            />
            <input
              type="email"
              placeholder="YOUR EMAIL"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="input-underline"
              style={{ marginTop: 20 }}
            />
            <input
              type="password"
              placeholder="PASSWORD"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="input-underline"
              style={{ marginTop: 20 }}
            />

            <button
              className="btn-primary"
              onClick={() => void goEmail()}
              disabled={isLoading || !isConfigured}
            >
              Continue with email
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: 16, margin: '22px 0' }}>
              <div style={{ flex: 1, height: 1, background: '#191919' }} />
              <span style={{ fontSize: 9.5, letterSpacing: '0.15em', color: '#383838' }}>OR</span>
              <div style={{ flex: 1, height: 1, background: '#191919' }} />
            </div>

            <button
              className="btn-outline"
              onClick={() => void goGoogle()}
              disabled={isLoading || !isConfigured}
            >
              Sign up with Google
            </button>

            {!isConfigured && (
              <p style={{ fontSize: 9.5, color: '#383838', marginTop: 20, letterSpacing: '0.04em' }}>
                Auth0 keys needed to activate.
              </p>
            )}

            <p style={{ fontSize: 10.5, letterSpacing: '0.08em', color: '#4a4a4a', marginTop: 28 }}>
              Already have an account?{' '}
              <Link to="/signin" style={{ color: '#888', textDecoration: 'underline' }}>
                Sign in
              </Link>
            </p>
          </div>

          <div className="relative mt-12 hidden h-[min(68vh,640px)] min-h-[520px] items-center lg:flex">
            <SplineSceneBasic />
          </div>
        </div>
      </div>

      <div style={{ padding: '22px 44px', display: 'flex', justifyContent: 'space-between', position: 'relative', zIndex: 1 }}>
        <span style={{ fontSize: 8.5, letterSpacing: '0.2em', color: '#252525' }}>© FITDECK</span>
        <span style={{ fontSize: 8.5, letterSpacing: '0.2em', color: '#252525' }}>BEARHACKS 2026</span>
      </div>
    </div>
  )
}
