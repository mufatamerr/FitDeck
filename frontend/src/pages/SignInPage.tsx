import { useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { DottedSurface } from '@/components/ui/dotted-surface'
import { SplineSceneBasic } from '@/components/ui/demo'
import { useFitAuth } from '../auth/FitAuth'

export function SignInPage() {
  const { isAuthenticated, isConfigured, isLoading, loginWithRedirect } = useFitAuth()
  const [email, setEmail] = useState('')

  if (isConfigured && isAuthenticated) return <Navigate to="/app" replace />

  const goEmail = async () => {
    await loginWithRedirect({
      appState: { returnTo: '/app' },
      authorizationParams: { login_hint: email || undefined },
    })
  }

  const bg  = '#070707'
  const fg  = '#ede9e3'

  return (
    <div style={{ width: '100%', height: '100%', background: bg, display: 'flex', flexDirection: 'column', position: 'relative', fontFamily: "'DM Sans',sans-serif" }}>
      <DottedSurface className="opacity-80" />
      <nav style={{ padding: '26px 44px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative', zIndex: 2 }}>
        <Link to="/" style={{ fontSize: 13, letterSpacing: '0.22em', color: fg, fontFamily: 'inherit', fontWeight: 500 }}>
          FITDECK
        </Link>
        <Link to="/signup" style={{ fontSize: 10.5, letterSpacing: '0.2em', color: '#555', fontFamily: "'DM Sans',sans-serif" }}>
          CREATE ACCOUNT
        </Link>
      </nav>

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', zIndex: 1 }}>
        <div className="w-full px-6 lg:grid lg:max-w-[1400px] lg:grid-cols-[minmax(320px,360px)_minmax(0,1fr)] lg:items-center lg:gap-10 lg:px-10">
          <div style={{ width: '100%', maxWidth: 360, animation: 'fadeUp 0.75s ease forwards' }}>
            <h2 style={{ fontFamily: "'Cormorant Garamond',Georgia,serif", fontSize: 42, fontWeight: 300, color: fg, letterSpacing: '-0.01em', lineHeight: 1.05 }}>
              Sign<br /><em>in.</em>
            </h2>

            <input
              type="email"
              placeholder="YOUR EMAIL"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="input-underline"
            />

            <button
              className="btn-primary"
              onClick={() => void goEmail()}
              disabled={isLoading || !isConfigured}
            >
              Continue
            </button>

            {!isConfigured && (
              <p style={{ fontSize: 9.5, color: '#383838', marginTop: 20, letterSpacing: '0.04em' }}>
                Auth0 keys needed to activate.
              </p>
            )}

            <p style={{ fontSize: 10.5, letterSpacing: '0.08em', color: '#4a4a4a', marginTop: 28 }}>
              Need an account?{' '}
              <Link to="/signup" style={{ color: '#888', textDecoration: 'underline' }}>
                Sign up
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
