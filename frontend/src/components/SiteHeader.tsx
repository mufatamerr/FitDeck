import { Link, NavLink } from 'react-router-dom'
import { useFitAuth } from '../auth/FitAuth'
import { BrandMark } from './BrandMark'

export function SiteHeader() {
  const { isAuthenticated, isConfigured, logout } = useFitAuth()

  return (
    <header className="page-shell pt-6">
      <div className="glass-panel flex flex-wrap items-center justify-between gap-4 px-5 py-4">
        <BrandMark subtle />
        <nav className="flex flex-wrap items-center gap-3 text-sm text-zinc-300">
          <NavLink to="/" className="nav-link">
            Main
          </NavLink>
          <NavLink to="/signup" className="nav-link">
            Sign up
          </NavLink>
          <NavLink to="/signin" className="nav-link">
            Sign in
          </NavLink>
          {isConfigured && isAuthenticated ? (
            <>
              <NavLink to="/app" className="nav-link">
                App
              </NavLink>
              <button
                type="button"
                onClick={() =>
                  logout({ logoutParams: { returnTo: window.location.origin } })
                }
                className="button-secondary"
              >
                Log out
              </button>
            </>
          ) : (
            <Link to="/signup" className="button-primary">
              Start styling
            </Link>
          )}
        </nav>
      </div>
    </header>
  )
}
