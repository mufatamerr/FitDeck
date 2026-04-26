import { useAuth0 } from '@auth0/auth0-react'
import { AnimatePresence, motion } from 'framer-motion'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { ApiClient } from '../services/api'

const apiBase = import.meta.env.VITE_API_URL || 'http://127.0.0.1:5000'

type Row = {
  auth0_id: string
  email?: string | null
  name?: string | null
  role: string
  onboarding_done: boolean
  created_at: string
}

/* ── Toast ── */
function Toast({ message, onDone }: { message: string; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 3800)
    return () => clearTimeout(t)
  }, [onDone])

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      transition={{ duration: 0.22, ease: 'easeOut' }}
      style={{
        position: 'fixed',
        bottom: 32,
        right: 40,
        background: 'rgba(14,14,14,0.96)',
        border: '1px solid rgba(237,233,227,0.12)',
        padding: '14px 22px',
        fontSize: 10.5,
        letterSpacing: '0.12em',
        color: '#ede9e3',
        fontFamily: "'DM Sans', sans-serif",
        zIndex: 9999,
      }}
    >
      {message}
    </motion.div>
  )
}

/* ── Inline confirm ── */
function InlineConfirm({
  onConfirm,
  onCancel,
}: {
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <motion.span
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      style={{ fontSize: 9, letterSpacing: '0.18em', color: 'rgba(200,160,80,0.7)' }}
    >
      CONFIRM?{' '}
      <button
        onClick={onConfirm}
        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 9, letterSpacing: '0.18em', color: 'rgba(200,160,80,0.9)', fontFamily: "'DM Sans', sans-serif", padding: 0 }}
      >
        YES
      </button>
      {' · '}
      <button
        onClick={onCancel}
        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 9, letterSpacing: '0.18em', color: 'rgba(237,233,227,0.4)', fontFamily: "'DM Sans', sans-serif", padding: 0 }}
      >
        NO
      </button>
    </motion.span>
  )
}

const COL = {
  th: {
    padding: '0 16px 12px',
    fontSize: 9,
    letterSpacing: '0.3em',
    color: 'rgba(237,233,227,0.3)',
    fontWeight: 400,
    textAlign: 'left' as const,
    borderBottom: '1px solid rgba(237,233,227,0.09)',
    whiteSpace: 'nowrap' as const,
  },
}

export function AdminUsersPage() {
  const { getAccessTokenSilently } = useAuth0()
  const api = useMemo(() => new ApiClient(apiBase, getAccessTokenSilently), [getAccessTokenSilently])
  const audience = import.meta.env.VITE_AUTH0_AUDIENCE

  const [rows, setRows]       = useState<Row[]>([])
  const [err, setErr]         = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch]   = useState('')
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [toast, setToast]     = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setErr(null)
    try {
      const data = await api.fetchJson<{ users: Row[] }>('/admin/users', {}, audience)
      setRows(data.users)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to load users')
    } finally {
      setLoading(false)
    }
  }, [api, audience])

  useEffect(() => { void load() }, [load])

  const filtered = rows.filter((r) => {
    const q = search.toLowerCase()
    return (r.email ?? '').toLowerCase().includes(q) || (r.name ?? '').toLowerCase().includes(q)
  })

  const exportCsv = () => {
    const header = 'Email,Name,Role,Onboarding,Created'
    const lines = filtered.map((r) =>
      [r.email, r.name, r.role, r.onboarding_done ? 'Yes' : 'No', r.created_at].join(','),
    )
    const blob = new Blob([[header, ...lines].join('\n')], { type: 'text/csv' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url; a.download = 'fitdeck-users.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  const handleSuspend = (id: string) => {
    setConfirmId(id)
  }

  const confirmSuspend = () => {
    setConfirmId(null)
    setToast('User suspended (demo — no API endpoint)')
  }

  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif", color: '#ede9e3' }}>
      {/* Header */}
      <div style={{ marginBottom: 40 }}>
        <h1
          style={{
            fontFamily: "'Cormorant Garamond', Georgia, serif",
            fontSize: 42,
            fontWeight: 300,
            fontStyle: 'italic',
            color: '#ede9e3',
            letterSpacing: '-0.01em',
            lineHeight: 1,
            margin: 0,
          }}
        >
          Users
        </h1>
        <div
          style={{
            marginTop: 10,
            fontSize: 8.5,
            letterSpacing: '0.28em',
            color: 'rgba(237,233,227,0.3)',
          }}
        >
          {rows.length.toLocaleString()} ACCOUNTS
        </div>
      </div>

      {/* Toolbar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          marginBottom: 32,
          gap: 20,
        }}
      >
        <input
          type="text"
          placeholder="SEARCH USERS"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input-underline"
          style={{ width: 280, maxWidth: '100%' }}
        />
        <button
          onClick={exportCsv}
          style={{
            background: 'transparent',
            border: '1px solid rgba(237,233,227,0.2)',
            color: 'rgba(237,233,227,0.6)',
            padding: '11px 28px',
            fontSize: 10.5,
            letterSpacing: '0.22em',
            fontFamily: "'DM Sans', sans-serif",
            cursor: 'pointer',
            fontWeight: 300,
            whiteSpace: 'nowrap',
            transition: 'color 150ms ease-out, border-color 150ms ease-out',
          }}
          onMouseEnter={(e) => {
            const el = e.currentTarget
            el.style.color = '#ede9e3'
            el.style.borderColor = 'rgba(237,233,227,0.45)'
          }}
          onMouseLeave={(e) => {
            const el = e.currentTarget
            el.style.color = 'rgba(237,233,227,0.6)'
            el.style.borderColor = 'rgba(237,233,227,0.2)'
          }}
        >
          EXPORT CSV
        </button>
      </div>

      {/* Loading bar */}
      {loading && (
        <div
          style={{
            height: 1,
            background: 'linear-gradient(to right, transparent, rgba(237,233,227,0.4), transparent)',
            marginBottom: 24,
            backgroundSize: '200% 100%',
            animation: 'shimmer 1.4s ease infinite',
          }}
        />
      )}

      {err && (
        <p
          style={{
            fontSize: 10.5,
            letterSpacing: '0.12em',
            color: 'rgba(200,160,80,0.7)',
            marginBottom: 24,
          }}
        >
          {err}
        </p>
      )}

      {/* Table */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {['EMAIL', 'NAME', 'ROLE', 'ONBOARDING', 'JOINED', 'ACTIONS'].map((h) => (
                <th key={h} style={COL.th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            <AnimatePresence>
              {filtered.map((r, i) => (
                <motion.tr
                  key={r.auth0_id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ delay: i * 0.025, duration: 0.3 }}
                  style={{ borderBottom: '1px solid rgba(237,233,227,0.04)', cursor: 'default' }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(237,233,227,0.025)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <td style={{ padding: '15px 16px', fontSize: 12, letterSpacing: '0.04em', color: 'rgba(237,233,227,0.8)', fontWeight: 300 }}>
                    {r.email ?? '—'}
                  </td>
                  <td style={{ padding: '15px 16px', fontSize: 12, letterSpacing: '0.04em', color: 'rgba(237,233,227,0.6)', fontWeight: 300 }}>
                    {r.name ?? '—'}
                  </td>
                  <td style={{ padding: '15px 16px' }}>
                    <span
                      style={{
                        fontSize: 9,
                        letterSpacing: '0.22em',
                        color: r.role === 'admin' ? 'rgba(237,233,227,0.8)' : 'rgba(237,233,227,0.4)',
                      }}
                    >
                      {r.role.toUpperCase()}
                    </span>
                  </td>
                  <td style={{ padding: '15px 16px' }}>
                    <span
                      style={{
                        fontSize: 9,
                        letterSpacing: '0.22em',
                        color: r.onboarding_done ? 'rgba(237,233,227,0.55)' : 'rgba(200,160,80,0.55)',
                      }}
                    >
                      {r.onboarding_done ? 'DONE' : 'PENDING'}
                    </span>
                  </td>
                  <td
                    style={{
                      padding: '15px 16px',
                      fontSize: 9,
                      letterSpacing: '0.14em',
                      color: 'rgba(237,233,227,0.3)',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {new Date(r.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase()}
                  </td>
                  <td style={{ padding: '15px 16px' }}>
                    {confirmId === r.auth0_id ? (
                      <InlineConfirm
                        onConfirm={confirmSuspend}
                        onCancel={() => setConfirmId(null)}
                      />
                    ) : (
                      <div style={{ display: 'flex', gap: 14 }}>
                        <button
                          style={{
                            background: 'none', border: 'none', cursor: 'pointer',
                            fontSize: 9, letterSpacing: '0.2em',
                            color: 'rgba(237,233,227,0.45)',
                            fontFamily: "'DM Sans', sans-serif", padding: 0,
                            textDecoration: 'none',
                            transition: 'color 120ms ease-out',
                          }}
                          onMouseEnter={(e) => ((e.target as HTMLElement).style.textDecoration = 'underline')}
                          onMouseLeave={(e) => ((e.target as HTMLElement).style.textDecoration = 'none')}
                        >
                          VIEW
                        </button>
                        <button
                          onClick={() => handleSuspend(r.auth0_id)}
                          style={{
                            background: 'none', border: 'none', cursor: 'pointer',
                            fontSize: 9, letterSpacing: '0.2em',
                            color: 'rgba(200,160,80,0.5)',
                            fontFamily: "'DM Sans', sans-serif", padding: 0,
                            transition: 'color 120ms ease-out',
                          }}
                          onMouseEnter={(e) => ((e.target as HTMLElement).style.textDecoration = 'underline')}
                          onMouseLeave={(e) => ((e.target as HTMLElement).style.textDecoration = 'none')}
                        >
                          SUSPEND
                        </button>
                      </div>
                    )}
                  </td>
                </motion.tr>
              ))}
            </AnimatePresence>

            {!loading && filtered.length === 0 && (
              <tr>
                <td colSpan={6} style={{ padding: '52px 16px', textAlign: 'center' }}>
                  <span
                    style={{
                      fontFamily: "'Cormorant Garamond', Georgia, serif",
                      fontSize: 24,
                      fontStyle: 'italic',
                      color: 'rgba(237,233,227,0.18)',
                    }}
                  >
                    {search ? 'No matches.' : 'No users yet.'}
                  </span>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Toast */}
      <AnimatePresence>
        {toast && <Toast message={toast} onDone={() => setToast(null)} />}
      </AnimatePresence>

      <style>{`
        @keyframes shimmer {
          0%   { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
      `}</style>
    </div>
  )
}
