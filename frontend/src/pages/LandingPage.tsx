import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useFitAuth } from '../auth/FitAuth'

const VIDEO_ID = 'GsyTVrbgfYI'

const BRANDS: {
  name: string
  left: string
  top: string
  size: number
  rotate: number
  dim: number
}[] = [
  { name: 'DIOR', left: '30%', top: '5%', size: 36, rotate: 0, dim: 0 },
  { name: 'FENDI', left: '48%', top: '4%', size: 32, rotate: 0, dim: 0 },
  { name: 'TOM FORD', left: '64%', top: '6%', size: 30, rotate: 0, dim: 0 },
  { name: 'BURBERRY', left: '14%', top: '7%', size: 32, rotate: -0.5, dim: 0 },
  { name: 'VERSACE', left: '80%', top: '5%', size: 34, rotate: 0, dim: 0 },
  { name: 'BALENCIAGA', left: '60%', top: '14%', size: 40, rotate: 0, dim: 0 },
  { name: 'CELINE', left: '12%', top: '16%', size: 36, rotate: -0.5, dim: 0 },
  { name: 'SAINT LAURENT', left: '40%', top: '13%', size: 30, rotate: 0, dim: 0 },
  { name: 'FEAR OF GOD', left: '80%', top: '17%', size: 30, rotate: 0, dim: 0 },
  { name: 'GIVENCHY', left: '24%', top: '24%', size: 34, rotate: 0.5, dim: 0 },
  { name: 'ALEXANDER MCQUEEN', left: '52%', top: '23%', size: 28, rotate: 0, dim: 0 },
  { name: 'RICK OWENS', left: '73%', top: '26%', size: 34, rotate: 0, dim: 0 },
  { name: 'LANVIN', left: '8%', top: '32%', size: 36, rotate: 0, dim: 0 },
  { name: 'MARNI', left: '36%', top: '33%', size: 38, rotate: -0.8, dim: 0 },
  { name: 'MAISON MARGIELA', left: '56%', top: '34%', size: 30, rotate: 0, dim: 0 },
  { name: 'MONCLER', left: '86%', top: '36%', size: 30, rotate: 0, dim: 0 },
  { name: 'OFF—WHITE', left: '18%', top: '41%', size: 32, rotate: 1, dim: 0 },
  { name: 'LOEWE', left: '43%', top: '43%', size: 48, rotate: 0, dim: 0 },
  { name: 'VETEMENTS', left: '65%', top: '40%', size: 30, rotate: 1, dim: 0 },
  { name: 'PRADA', left: '78%', top: '46%', size: 52, rotate: 0, dim: 0 },
  { name: 'THOM BROWNE', left: '6%', top: '50%', size: 30, rotate: 0, dim: 0 },
  { name: 'STONE ISLAND', left: '28%', top: '52%', size: 32, rotate: 0, dim: 0 },
  { name: 'VALENTINO', left: '55%', top: '53%', size: 34, rotate: -1, dim: 0 },
  { name: 'COMME DES GARCONS', left: '82%', top: '57%', size: 26, rotate: 0, dim: 0 },
  { name: 'RAF SIMONS', left: '10%', top: '63%', size: 32, rotate: 0, dim: 0 },
  { name: 'BOTTEGA VENETA', left: '34%', top: '62%', size: 32, rotate: 0.5, dim: 0 },
  { name: 'ACNE STUDIOS', left: '60%', top: '64%', size: 32, rotate: -0.5, dim: 0 },
  { name: 'AMIRI', left: '84%', top: '66%', size: 40, rotate: 0, dim: 0 },
  { name: 'CHROME HEARTS', left: '5%', top: '74%', size: 28, rotate: 0, dim: 0 },
  { name: 'GUCCI', left: '26%', top: '72%', size: 44, rotate: 0, dim: 0 },
  { name: 'DRIES VAN NOTEN', left: '48%', top: '75%', size: 30, rotate: 0, dim: 0 },
  { name: 'JIL SANDER', left: '72%', top: '73%', size: 32, rotate: 0, dim: 0 },
  { name: 'PALM ANGELS', left: '8%', top: '83%', size: 30, rotate: 0, dim: 0 },
  { name: 'KENZO', left: '30%', top: '84%', size: 34, rotate: 0, dim: 0 },
  { name: 'JACQUEMUS', left: '50%', top: '83%', size: 32, rotate: 0, dim: 0 },
  { name: 'SACAI', left: '68%', top: '85%', size: 30, rotate: -0.5, dim: 0 },
  { name: 'HELMUT LANG', left: '84%', top: '82%', size: 28, rotate: 0, dim: 0 },
]

function BrandConstellation() {
  return (
    <>
      {BRANDS.map((b) => (
        <div
          key={b.name}
          className="brand-label"
          style={{
            '--base-opacity': b.dim,
            position: 'absolute',
            left: b.left,
            top: b.top,
            zIndex: 15,
            transform: `rotate(${b.rotate}deg)`,
            fontSize: b.size,
            letterSpacing: '0.3em',
            fontFamily: "'DM Sans', sans-serif",
            fontWeight: 200,
            color: '#d8cfc4',
          } as React.CSSProperties}
        >
          {b.name}
        </div>
      ))}
    </>
  )
}

export function LandingPage() {
  const navigate = useNavigate()
  const { isAuthenticated, isConfigured, isLoading, logout } = useFitAuth()

  const fg = '#ede9e3'
  const bg = '#070707'

  if (isLoading) {
    return <div className="page-loader"><div className="page-loader__ring" /></div>
  }

  return (
    <div style={{ width: '100%', minHeight: '100vh', background: bg, overflow: 'hidden', position: 'relative', fontFamily: "'DM Sans',sans-serif" }}>
      <div style={{
        position: 'absolute', inset: 0, zIndex: 1, overflow: 'hidden',
        filter: 'sepia(0.5) contrast(1.06) brightness(0.65) saturate(0.7)',
      }}>
        <iframe
          title="runway"
          src={`https://www.youtube.com/embed/${VIDEO_ID}?autoplay=1&mute=1&loop=1&playlist=${VIDEO_ID}&controls=0&rel=0&iv_load_policy=3&modestbranding=1&disablekb=1&fs=0&playsinline=1`}
          allow="autoplay; encrypted-media"
          style={{
            position: 'absolute',
            top: '50%', left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '177.78vh',
            height: '100vh',
            minWidth: '100vw',
            minHeight: '56.25vw',
            border: 'none',
            pointerEvents: 'none',
          }}
        />
      </div>

      <div style={{
        position: 'absolute', inset: 0, zIndex: 2, pointerEvents: 'none',
        background: 'rgba(55, 30, 8, 0.22)',
        mixBlendMode: 'multiply' as const,
      }} />
      <div style={{
        position: 'absolute', inset: 0, zIndex: 3, pointerEvents: 'none',
        background: 'radial-gradient(ellipse 75% 75% at 50% 44%, transparent 28%, rgba(0,0,0,0.88) 100%)',
      }} />
      <div style={{
        position: 'absolute', inset: '-50%', zIndex: 4, pointerEvents: 'none',
        opacity: 0.06,
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
        backgroundSize: '200px 200px',
        animation: 'grain 0.4s steps(2) infinite',
      }} />
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, height: 220,
        background: 'linear-gradient(to top, rgba(4,3,2,0.98) 0%, transparent 100%)',
        zIndex: 5, pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 160,
        background: 'linear-gradient(to bottom, rgba(4,3,2,0.7) 0%, transparent 100%)',
        zIndex: 5, pointerEvents: 'none',
      }} />

      <BrandConstellation />

      <nav style={{ position: 'absolute', top: 0, left: 0, right: 0, padding: '26px 44px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 100 }}>
        <span style={{ fontSize: 13, letterSpacing: '0.22em', color: fg, fontWeight: 500 }}>FITDECK</span>
        <div style={{ display: 'flex', gap: 28, alignItems: 'center' }}>
          {isConfigured && isAuthenticated ? (
            <button
              onClick={() => logout({ logoutParams: { returnTo: window.location.origin } })}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 10.5, letterSpacing: '0.22em', color: '#888', fontFamily: "'DM Sans',sans-serif", padding: 0 }}
            >
              SIGN OUT
            </button>
          ) : (
            <button
              onClick={() => navigate('/signin')}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 10.5, letterSpacing: '0.22em', color: '#888', fontFamily: "'DM Sans',sans-serif", padding: 0 }}
            >
              SIGN IN
            </button>
          )}
          <button
            onClick={() => navigate('/admin-login')}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 9, letterSpacing: '0.22em', color: '#333', fontFamily: "'DM Sans',sans-serif", padding: 0 }}
          >
            ADMIN
          </button>
        </div>
      </nav>

      <div className="fade-up" style={{ position: 'absolute', left: 60, bottom: 118, zIndex: 20 }}>
        <h1 style={{
          fontFamily: "'Cormorant Garamond', Georgia, serif",
          fontSize: 'clamp(38px, 5.8vw, 90px)',
          fontWeight: 300,
          color: fg,
          lineHeight: 0.9,
          letterSpacing: '-0.025em',
          maxWidth: 640,
        }}>
          See the fit<br />
          <em style={{ fontStyle: 'italic', fontWeight: 300 }}>before</em> you buy.
        </h1>

        <p style={{ fontSize: 11.5, letterSpacing: '0.07em', color: 'rgba(237,233,227,0.4)', marginTop: 20, lineHeight: 1.95, fontWeight: 300, maxWidth: 290 }}>
          A private runway for your wardrobe.<br />Tailored by AI, worn only by you.
        </p>

        <div style={{ display: 'flex', gap: 3, marginTop: 38 }}>
          <button
            onClick={() => navigate('/signup')}
            style={{ background: fg, color: bg, border: 'none', padding: '19px 50px', fontSize: 10.5, letterSpacing: '0.22em', fontFamily: "'DM Sans',sans-serif", cursor: 'pointer', fontWeight: 500 }}
          >
            SIGN UP
          </button>
          <button
            onClick={() => navigate('/signin')}
            style={{ background: 'transparent', color: fg, border: '1px solid rgba(255,255,255,0.2)', padding: '19px 50px', fontSize: 10.5, letterSpacing: '0.22em', fontFamily: "'DM Sans',sans-serif", cursor: 'pointer', fontWeight: 300 }}
          >
            SIGN IN
          </button>
        </div>
      </div>

      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '0 44px 22px', display: 'flex', justifyContent: 'space-between', zIndex: 20 }}>
        <span style={{ fontSize: 8.5, letterSpacing: '0.2em', color: 'rgba(255,255,255,0.14)' }}>© FITDECK MMXXVI</span>
        <span style={{ fontSize: 8.5, letterSpacing: '0.2em', color: 'rgba(255,255,255,0.14)' }}>SPRING / SUMMER 26</span>
      </div>
    </div>
  )
}
