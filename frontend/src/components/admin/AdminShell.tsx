import { motion } from 'framer-motion'
import { NavLink, Outlet } from 'react-router-dom'
import { useFitAuth } from '../../auth/FitAuth'

const NAV = [
  { to: '/admin', label: 'OVERVIEW', end: true },
  { to: '/admin/users', label: 'USERS', end: false },
  { to: '/admin/catalog', label: 'CATALOG', end: false },
]

const S = {
  shell: {
    display: 'flex' as const,
    height: '100%',
    background: '#070707',
    fontFamily: "'DM Sans', sans-serif",
    color: '#ede9e3',
  },
  sidebar: {
    width: 220,
    flexShrink: 0,
    borderRight: '1px solid rgba(237,233,227,0.07)',
    display: 'flex' as const,
    flexDirection: 'column' as const,
    position: 'fixed' as const,
    top: 0,
    bottom: 0,
    left: 0,
    zIndex: 50,
    background: '#070707',
  },
  wordmarkWrap: {
    padding: '32px 32px 40px',
  },
  wordmark: {
    fontSize: 13,
    letterSpacing: '0.22em',
    color: '#ede9e3',
    fontWeight: 500,
  },
  consoleLbl: {
    marginTop: 6,
    fontSize: 8,
    letterSpacing: '0.3em',
    color: 'rgba(237,233,227,0.28)',
  },
  nav: {
    flex: 1,
  },
  bottomBar: {
    padding: '20px 32px',
    borderTop: '1px solid rgba(237,233,227,0.05)',
  },
  signOut: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: 9.5,
    letterSpacing: '0.22em',
    color: 'rgba(237,233,227,0.25)',
    fontFamily: "'DM Sans', sans-serif",
    padding: 0,
    transition: 'color 150ms ease-out',
  },
  main: {
    marginLeft: 220,
    flex: 1,
    overflowY: 'auto' as const,
    height: '100%',
    padding: '52px 56px',
  },
}

export function AdminShell() {
  const { isConfigured, logout } = useFitAuth()

  return (
    <div style={S.shell}>
      <aside style={S.sidebar}>
        <div style={S.wordmarkWrap}>
          <div style={S.wordmark}>FITDECK</div>
          <div style={S.consoleLbl}>ADMIN CONSOLE</div>
        </div>

        <nav style={S.nav}>
          {NAV.map((item, i) => (
            <motion.div
              key={item.to}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.06, duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            >
              <NavLink
                to={item.to}
                end={item.end}
                style={({ isActive }) => ({
                  display: 'flex',
                  alignItems: 'center',
                  padding: '0 30px',
                  height: 40,
                  fontSize: 10.5,
                  letterSpacing: '0.22em',
                  fontWeight: isActive ? 500 : 300,
                  color: isActive ? '#ede9e3' : 'rgba(237,233,227,0.42)',
                  borderLeft: `2px solid ${isActive ? '#ede9e3' : 'transparent'}`,
                  textDecoration: 'none',
                  transition: 'color 150ms ease-out, border-color 150ms ease-out',
                })}
              >
                {item.label}
              </NavLink>
            </motion.div>
          ))}
        </nav>

        <div style={S.bottomBar}>
          <button
            style={S.signOut}
            onClick={() =>
              isConfigured && logout({ logoutParams: { returnTo: window.location.origin } })
            }
            onMouseEnter={(e) => ((e.target as HTMLButtonElement).style.color = 'rgba(237,233,227,0.5)')}
            onMouseLeave={(e) => ((e.target as HTMLButtonElement).style.color = 'rgba(237,233,227,0.25)')}
          >
            SIGN OUT
          </button>
        </div>
      </aside>

      <main style={S.main}>
        <Outlet />
      </main>
    </div>
  )
}
