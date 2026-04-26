import { useLocation, useNavigate } from 'react-router-dom'
import { useFitAuth } from '../auth/FitAuth'

const LINKS = [
  { label: 'WARDROBE', path: '/app/wardrobe' },
  { label: 'CATALOG',  path: '/app/discover'  },
  { label: 'BUILDER',  path: '/app/builder'   },
  { label: 'CLOSET',   path: '/app/closet'    },
]

export function InnerNav() {
  const navigate  = useNavigate()
  const { pathname } = useLocation()
  const { logout } = useFitAuth()

  return (
    <nav style={{
      position: 'sticky', top: 0, zIndex: 50,
      background: 'rgba(4,3,2,0.9)',
      backdropFilter: 'blur(18px)',
      WebkitBackdropFilter: 'blur(18px)',
      borderBottom: '1px solid rgba(255,255,255,0.07)',
      padding: '20px 48px',
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      fontFamily: "'DM Sans',sans-serif",
    }}>
      <button
        onClick={() => navigate('/app')}
        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, letterSpacing: '0.22em', color: '#ede9e3', fontWeight: 500, padding: 0 }}
      >
        FITDECK
      </button>

      <div style={{ display: 'flex', alignItems: 'center', gap: 28 }}>
        {LINKS.map(l => {
          const active = pathname.startsWith(l.path)
          return (
            <button
              key={l.path}
              onClick={() => navigate(l.path)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                fontSize: 9.5, letterSpacing: '0.22em', fontFamily: "'DM Sans',sans-serif",
                color: active ? '#ede9e3' : '#555',
                borderBottom: active ? '1px solid rgba(237,233,227,0.4)' : '1px solid transparent',
                paddingBottom: 2,
                transition: 'color 0.2s',
              }}
            >
              {l.label}
            </button>
          )
        })}
        <button
          onClick={() => logout({ logoutParams: { returnTo: window.location.origin } })}
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 9.5, letterSpacing: '0.22em', color: '#333', fontFamily: "'DM Sans',sans-serif", padding: 0 }}
        >
          SIGN OUT
        </button>
      </div>
    </nav>
  )
}
