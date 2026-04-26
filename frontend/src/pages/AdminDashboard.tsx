import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { VintageVideoBackground } from '../components/VintageVideoBackground'

const API = import.meta.env.VITE_API_URL || 'http://127.0.0.1:5000'

const fg   = '#ede9e3'
const bg   = '#070707'
const muted = '#3a3a3a'

type Stats = {
  db: { users: number; catalog_items: number; wardrobe_items: number; outfits_total: number; outfits_saved: number; db_url: string }
  services: Record<string, boolean>
}
type UserRow = { id: number; auth0_id: string; email: string; name: string; role: string; onboarding_done: boolean; created_at: string }
type CatalogRow = { id: string; name: string; brand: string; category: string; source: string; is_active: boolean; image_url: string; created_at: string }

function useAdminFetch<T>(path: string) {
  const [data, setData]   = useState<T | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    const token = sessionStorage.getItem('admin_token')
    fetch(`${API}${path}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() as Promise<T> : r.json().then((e: { error?: string }) => Promise.reject(e.error || `HTTP ${r.status}`)))
      .then(setData)
      .catch((e: unknown) => setError(String(e)))
      .finally(() => setLoading(false))
  }, [path])
  return { data, error, loading }
}

/* ── small components ──────────────────────────────────────────────────────── */

function StatCard({ label, value, sub }: { label: string; value: number | string; sub?: string }) {
  return (
    <div style={{ border: '1px solid #1a1a1a', padding: '24px 28px', flex: 1, minWidth: 140 }}>
      <p style={{ fontSize: 9, letterSpacing: '0.28em', color: muted, marginBottom: 12 }}>{label}</p>
      <p style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 42, fontWeight: 300, color: fg, lineHeight: 1 }}>{value}</p>
      {sub && <p style={{ fontSize: 9.5, color: '#2a2a2a', marginTop: 8, letterSpacing: '0.06em' }}>{sub}</p>}
    </div>
  )
}

function ServiceBadge({ name, ok }: { name: string; ok: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: '1px solid #111' }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: ok ? '#2a6b3a' : '#4a1a1a', flexShrink: 0 }} />
      <span style={{ fontSize: 10.5, letterSpacing: '0.14em', color: ok ? '#4a8a5a' : '#6b2020' }}>{name.toUpperCase()}</span>
      <span style={{ marginLeft: 'auto', fontSize: 9, letterSpacing: '0.1em', color: ok ? '#2a4a2a' : '#3a1a1a' }}>{ok ? 'ACTIVE' : 'NOT SET'}</span>
    </div>
  )
}

/* ── main page ──────────────────────────────────────────────────────────────── */

export function AdminDashboard() {
  const navigate  = useNavigate()
  const [tab, setTab] = useState<'overview' | 'users' | 'catalog'>('overview')

  const { data: stats,   error: statsErr,   loading: statsLoading }   = useAdminFetch<Stats>('/dev-admin/stats')
  const { data: users,   error: usersErr,   loading: usersLoading }   = useAdminFetch<UserRow[]>('/dev-admin/users')
  const { data: catalog, error: catalogErr, loading: catalogLoading } = useAdminFetch<CatalogRow[]>('/dev-admin/catalog')

  const signOut = () => { sessionStorage.removeItem('admin_token'); navigate('/admin-login') }

  // Redirect if no token
  useEffect(() => {
    if (!sessionStorage.getItem('admin_token')) navigate('/admin-login')
  }, [navigate])

  const tabBtn = (t: typeof tab, label: string) => (
    <button
      onClick={() => setTab(t)}
      style={{
        background: 'none', border: 'none', cursor: 'pointer',
        fontSize: 10, letterSpacing: '0.22em', fontFamily: "'DM Sans',sans-serif",
        color: tab === t ? fg : muted,
        borderBottom: tab === t ? `1px solid ${fg}` : '1px solid transparent',
        paddingBottom: 6, padding: '0 0 6px 0', marginRight: 32,
      }}
    >
      {label}
    </button>
  )

  return (
    <div style={{ width: '100%', minHeight: '100%', background: bg, fontFamily: "'DM Sans',sans-serif", color: fg, overflowY: 'auto', position: 'relative' }}>

      {/* ── VIDEO BACKGROUND ── */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }}>
        <VintageVideoBackground opacity={0.78} />
      </div>
      <div style={{ position: 'fixed', inset: 0, zIndex: 1, pointerEvents: 'none', background: 'rgba(7,7,7,0.36)' }} />

      {/* NAV */}
      <nav style={{ position: 'sticky', top: 0, background: 'rgba(7,7,7,0.85)', backdropFilter: 'blur(12px)', borderBottom: '1px solid #1e1e1e', padding: '20px 48px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 50 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
          <span style={{ fontSize: 13, letterSpacing: '0.22em', fontWeight: 500 }}>FITDECK</span>
          <span style={{ fontSize: 9, letterSpacing: '0.28em', color: muted }}>ADMIN</span>
        </div>
        <button onClick={signOut} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 10, letterSpacing: '0.2em', color: muted, fontFamily: "'DM Sans',sans-serif" }}>
          SIGN OUT
        </button>
      </nav>

      <div style={{ position: 'relative', zIndex: 10, padding: '48px 48px 80px' }}>

        {/* HEADER */}
        <h1 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 'clamp(36px,5vw,72px)', fontWeight: 300, lineHeight: 0.92, letterSpacing: '-0.02em', marginBottom: 12 }}>
          Dashboard.
        </h1>
        <p style={{ fontSize: 11, letterSpacing: '0.08em', color: muted, marginBottom: 40 }}>admin@fitdeck.dev</p>

        {/* TABS */}
        <div style={{ borderBottom: '1px solid #111', marginBottom: 40 }}>
          {tabBtn('overview', 'OVERVIEW')}
          {tabBtn('users',    'USERS')}
          {tabBtn('catalog',  'CATALOG')}
        </div>

        {/* OVERVIEW TAB */}
        {tab === 'overview' && (
          <>
            {statsLoading && <p style={{ color: muted, fontSize: 11, letterSpacing: '0.1em' }}>Loading…</p>}
            {statsErr && <p style={{ color: '#8b2020', fontSize: 11 }}>{statsErr}</p>}
            {stats && (
              <>
                {/* DB stats */}
                <p style={{ fontSize: 9, letterSpacing: '0.28em', color: muted, marginBottom: 20 }}>DATABASE</p>
                <div style={{ display: 'flex', gap: 1, flexWrap: 'wrap', marginBottom: 48 }}>
                  <StatCard label="USERS"          value={stats.db.users} />
                  <StatCard label="CATALOG ITEMS"  value={stats.db.catalog_items} />
                  <StatCard label="WARDROBE ITEMS" value={stats.db.wardrobe_items} />
                  <StatCard label="OUTFITS TOTAL"  value={stats.db.outfits_total} sub={`${stats.db.outfits_saved} saved`} />
                </div>

                <p style={{ fontSize: 9.5, letterSpacing: '0.12em', color: '#1e1e1e', marginBottom: 40 }}>
                  {stats.db.db_url}
                </p>

                {/* Services */}
                <p style={{ fontSize: 9, letterSpacing: '0.28em', color: muted, marginBottom: 20 }}>API SERVICES</p>
                <div style={{ maxWidth: 400 }}>
                  {Object.entries(stats.services).map(([k, v]) => (
                    <ServiceBadge key={k} name={k.replace(/_/g, ' ')} ok={v} />
                  ))}
                </div>
              </>
            )}
          </>
        )}

        {/* USERS TAB */}
        {tab === 'users' && (
          <>
            {usersLoading && <p style={{ color: muted, fontSize: 11, letterSpacing: '0.1em' }}>Loading…</p>}
            {usersErr && <p style={{ color: '#8b2020', fontSize: 11 }}>{usersErr}</p>}
            {users && (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #1a1a1a' }}>
                      {['EMAIL','NAME','ROLE','ONBOARDING','JOINED'].map(h => (
                        <th key={h} style={{ textAlign: 'left', padding: '0 16px 14px 0', fontSize: 9, letterSpacing: '0.22em', color: muted, fontWeight: 400 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {users.map(u => (
                      <tr key={u.id} style={{ borderBottom: '1px solid #0f0f0f' }}>
                        <td style={{ padding: '14px 16px 14px 0', color: fg }}>{u.email || '—'}</td>
                        <td style={{ padding: '14px 16px 14px 0', color: '#555' }}>{u.name || '—'}</td>
                        <td style={{ padding: '14px 16px 14px 0' }}>
                          <span style={{ fontSize: 9, letterSpacing: '0.16em', color: u.role === 'admin' ? '#4a8a5a' : '#444', border: '1px solid currentColor', padding: '2px 8px' }}>
                            {(u.role || 'user').toUpperCase()}
                          </span>
                        </td>
                        <td style={{ padding: '14px 16px 14px 0', color: u.onboarding_done ? '#4a8a5a' : '#444', fontSize: 10 }}>
                          {u.onboarding_done ? 'DONE' : 'PENDING'}
                        </td>
                        <td style={{ padding: '14px 0', color: muted, fontSize: 10 }}>
                          {u.created_at ? new Date(u.created_at).toLocaleDateString('en-CA') : '—'}
                        </td>
                      </tr>
                    ))}
                    {users.length === 0 && (
                      <tr><td colSpan={5} style={{ padding: '32px 0', color: muted, fontSize: 11 }}>No users yet.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {/* CATALOG TAB */}
        {tab === 'catalog' && (
          <>
            {catalogLoading && <p style={{ color: muted, fontSize: 11, letterSpacing: '0.1em' }}>Loading…</p>}
            {catalogErr && <p style={{ color: '#8b2020', fontSize: 11 }}>{catalogErr}</p>}
            {catalog && (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #1a1a1a' }}>
                      {['NAME','BRAND','CATEGORY','SOURCE','STATUS','ADDED'].map(h => (
                        <th key={h} style={{ textAlign: 'left', padding: '0 16px 14px 0', fontSize: 9, letterSpacing: '0.22em', color: muted, fontWeight: 400 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {catalog.map(c => (
                      <tr key={c.id} style={{ borderBottom: '1px solid #0f0f0f' }}>
                        <td style={{ padding: '14px 16px 14px 0', color: fg }}>{c.name}</td>
                        <td style={{ padding: '14px 16px 14px 0', color: '#555' }}>{c.brand || '—'}</td>
                        <td style={{ padding: '14px 16px 14px 0', color: '#555' }}>{c.category}</td>
                        <td style={{ padding: '14px 16px 14px 0', color: '#444', fontSize: 9, letterSpacing: '0.1em' }}>{c.source.toUpperCase()}</td>
                        <td style={{ padding: '14px 16px 14px 0' }}>
                          <span style={{ fontSize: 9, letterSpacing: '0.16em', color: c.is_active ? '#4a8a5a' : '#6b2020', border: '1px solid currentColor', padding: '2px 8px' }}>
                            {c.is_active ? 'ACTIVE' : 'INACTIVE'}
                          </span>
                        </td>
                        <td style={{ padding: '14px 0', color: muted, fontSize: 10 }}>
                          {c.created_at ? new Date(c.created_at).toLocaleDateString('en-CA') : '—'}
                        </td>
                      </tr>
                    ))}
                    {catalog.length === 0 && (
                      <tr><td colSpan={6} style={{ padding: '32px 0', color: muted, fontSize: 11 }}>No catalog items yet.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

      </div>
    </div>
  )
}
