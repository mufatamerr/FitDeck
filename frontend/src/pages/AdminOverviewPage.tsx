import { animate } from 'framer-motion'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useAuth0 } from '@auth0/auth0-react'
import { ApiClient } from '../services/api'

const apiBase = import.meta.env.VITE_API_URL || 'http://127.0.0.1:5000'

type UserRow = {
  auth0_id: string
  email?: string | null
  name?: string | null
  role: string
  created_at: string
}

type CatalogRow = {
  id: string
  name: string
  brand?: string | null
  category: string
  is_active: boolean
  created_at: string
}

/* ── Animated number counter (21st.dev-style) ── */
function AnimatedNumber({ value, prefix = '' }: { value: number; prefix?: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  useEffect(() => {
    const controls = animate(0, value, {
      duration: 1.6,
      ease: [0.16, 1, 0.3, 1],
      onUpdate(v: number) {
        if (ref.current) ref.current.textContent = prefix + Math.round(v).toLocaleString()
      },
    })
    return () => controls.stop()
  }, [value, prefix])
  return <span ref={ref}>{prefix}0</span>
}

/* ── Sparkline chart ── */
function buildSmoothPath(pts: { x: number; y: number }[]) {
  if (pts.length < 2) return ''
  let d = `M${pts[0].x},${pts[0].y}`
  for (let i = 1; i < pts.length; i++) {
    const cpx = (pts[i - 1].x + pts[i].x) / 2
    d += ` C${cpx},${pts[i - 1].y} ${cpx},${pts[i].y} ${pts[i].x},${pts[i].y}`
  }
  return d
}

function Sparkline({ data, label }: { data: number[]; label: string }) {
  const w = 800
  const h = 72
  const pad = 4
  const max = Math.max(...data, 1)

  const pts = data.map((v, i) => ({
    x: (i / (data.length - 1)) * w,
    y: h - pad - ((v / max) * (h - pad * 2)),
  }))

  const linePath = buildSmoothPath(pts)
  const fillPath =
    linePath +
    ` L${pts[pts.length - 1].x},${h} L${pts[0].x},${h} Z`

  return (
    <div style={{ width: '100%' }}>
      <div
        style={{
          fontSize: 9,
          letterSpacing: '0.28em',
          color: 'rgba(237,233,227,0.3)',
          marginBottom: 12,
        }}
      >
        {label}
      </div>
      <svg
        viewBox={`0 0 ${w} ${h}`}
        preserveAspectRatio="none"
        style={{ width: '100%', height: 72, display: 'block' }}
      >
        <defs>
          <linearGradient id="sparkFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(237,233,227,0.12)" />
            <stop offset="100%" stopColor="rgba(237,233,227,0)" />
          </linearGradient>
        </defs>
        {/* grid lines */}
        {[0.25, 0.5, 0.75].map((f) => (
          <line
            key={f}
            x1={0}
            y1={h * f}
            x2={w}
            y2={h * f}
            stroke="rgba(237,233,227,0.04)"
            strokeWidth={1}
          />
        ))}
        <path d={fillPath} fill="url(#sparkFill)" />
        <path d={linePath} fill="none" stroke="rgba(237,233,227,0.55)" strokeWidth={1.5} />
      </svg>
    </div>
  )
}

/* ── KPI Card ── */
function KpiCard({
  label,
  value,
  delta,
  positive,
  delay,
}: {
  label: string
  value: number
  delta?: string
  positive?: boolean
  delay: number
}) {
  return (
    <div
      style={{
        border: '1px solid rgba(237,233,227,0.07)',
        background: 'rgba(255,255,255,0.025)',
        padding: '28px 28px 24px',
        animation: `fadeUp 0.6s ${delay}ms ease forwards`,
        opacity: 0,
      }}
    >
      <div
        style={{
          fontSize: 9,
          letterSpacing: '0.3em',
          color: 'rgba(237,233,227,0.35)',
          textTransform: 'uppercase',
        }}
      >
        {label}
      </div>
      <div
        style={{
          marginTop: 16,
          fontFamily: "'Cormorant Garamond', Georgia, serif",
          fontSize: 52,
          fontWeight: 300,
          color: '#ede9e3',
          lineHeight: 1,
          letterSpacing: '-0.02em',
        }}
      >
        <AnimatedNumber value={value} />
      </div>
      {delta && (
        <div
          style={{
            marginTop: 10,
            fontSize: 9,
            letterSpacing: '0.12em',
            color: positive ? 'rgba(237,233,227,0.5)' : 'rgba(200,160,80,0.65)',
          }}
        >
          {delta}
        </div>
      )}
    </div>
  )
}

/* ── Activity Row ── */
function ActivityRow({ label, sub, index }: { label: string; sub: string; index: number }) {
  return (
    <div
      style={{
        padding: '12px 0',
        borderBottom: '1px solid rgba(237,233,227,0.05)',
        animation: `fadeUp 0.5s ${index * 40 + 200}ms ease forwards`,
        opacity: 0,
      }}
    >
      <div style={{ fontSize: 10.5, letterSpacing: '0.08em', color: 'rgba(237,233,227,0.75)', fontWeight: 300 }}>
        {label}
      </div>
      <div style={{ marginTop: 3, fontSize: 8.5, letterSpacing: '0.18em', color: 'rgba(237,233,227,0.28)' }}>
        {sub}
      </div>
    </div>
  )
}

/* ── Bucket users by day ── */
function buildSignupBuckets(users: UserRow[], days = 30): number[] {
  const buckets = new Array(days).fill(0)
  const now = Date.now()
  const DAY_MS = 86_400_000
  users.forEach((u) => {
    const age = Math.floor((now - new Date(u.created_at).getTime()) / DAY_MS)
    if (age >= 0 && age < days) buckets[days - 1 - age]++
  })
  return buckets
}

/* ── Page ── */
export function AdminOverviewPage() {
  const { getAccessTokenSilently } = useAuth0()
  const api = useMemo(() => new ApiClient(apiBase, getAccessTokenSilently), [getAccessTokenSilently])
  const audience = import.meta.env.VITE_AUTH0_AUDIENCE

  const [users, setUsers] = useState<UserRow[]>([])
  const [catalog, setCatalog] = useState<CatalogRow[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [ud, cd] = await Promise.all([
        api.fetchJson<{ users: UserRow[] }>('/admin/users', {}, audience),
        api.fetchJson<{ items: CatalogRow[] }>('/admin/catalog', {}, audience),
      ])
      setUsers(ud.users)
      setCatalog(cd.items)
    } catch {
      /* surface silently – stat cards show 0 */
    } finally {
      setLoading(false)
    }
  }, [api, audience])

  useEffect(() => { void load() }, [load])

  const totalUsers   = users.length
  const activeItems  = catalog.filter((c) => c.is_active).length
  const totalCatalog = catalog.length
  const buckets      = buildSignupBuckets(users)

  /* Recent activity: last 10 events merged from both lists */
  const activity = [
    ...users.map((u) => ({ label: u.email ?? 'New user', sub: 'USER SIGNED UP', ts: u.created_at })),
    ...catalog.map((c) => ({ label: c.name, sub: 'CATALOG ITEM ADDED', ts: c.created_at })),
  ]
    .sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime())
    .slice(0, 10)

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  }).toUpperCase()

  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif", color: '#ede9e3' }}>
      {/* Header */}
      <div style={{ marginBottom: 48 }}>
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
          Overview
        </h1>
        <div
          style={{
            marginTop: 10,
            fontSize: 8.5,
            letterSpacing: '0.28em',
            color: 'rgba(237,233,227,0.3)',
          }}
        >
          {today}
        </div>
      </div>

      {loading ? (
        <div
          style={{
            height: 3,
            background: 'linear-gradient(to right, rgba(237,233,227,0) 0%, rgba(237,233,227,0.35) 50%, rgba(237,233,227,0) 100%)',
            animation: 'progressBar 1.4s ease-in-out infinite',
            marginBottom: 48,
          }}
        />
      ) : null}

      {/* KPI Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 3,
          marginBottom: 3,
        }}
      >
        <KpiCard label="Total Users"    value={totalUsers}   delta={`${totalUsers} accounts total`}   positive delay={0} />
        <KpiCard label="Catalog Items"  value={totalCatalog} delta={`${activeItems} currently active`} positive delay={80} />
        <KpiCard label="Active Items"   value={activeItems}  delta={`${totalCatalog - activeItems} inactive`} positive={totalCatalog - activeItems === 0} delay={160} />
        <KpiCard label="Roles Assigned" value={users.filter(u => u.role !== 'user').length} delta="non-default roles" positive delay={240} />
      </div>

      {/* Sparkline + Activity */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 3, marginTop: 3 }}>
        {/* Sparkline panel */}
        <div
          style={{
            border: '1px solid rgba(237,233,227,0.07)',
            background: 'rgba(255,255,255,0.025)',
            padding: '28px 28px 24px',
          }}
        >
          <div
            style={{
              fontSize: 9,
              letterSpacing: '0.28em',
              color: 'rgba(237,233,227,0.35)',
              marginBottom: 28,
            }}
          >
            USER SIGNUPS — LAST 30 DAYS
          </div>

          {totalUsers === 0 ? (
            <div
              style={{
                height: 72,
                display: 'flex',
                alignItems: 'center',
                fontFamily: "'Cormorant Garamond', Georgia, serif",
                fontSize: 22,
                fontStyle: 'italic',
                color: 'rgba(237,233,227,0.18)',
              }}
            >
              No data yet.
            </div>
          ) : (
            <Sparkline data={buckets} label="" />
          )}

          {/* X-axis labels */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginTop: 12,
              fontSize: 8,
              letterSpacing: '0.16em',
              color: 'rgba(237,233,227,0.22)',
            }}
          >
            <span>30 DAYS AGO</span>
            <span>15 DAYS AGO</span>
            <span>TODAY</span>
          </div>
        </div>

        {/* Activity feed */}
        <div
          style={{
            border: '1px solid rgba(237,233,227,0.07)',
            background: 'rgba(255,255,255,0.025)',
            padding: '28px 24px',
            overflowY: 'auto',
          }}
        >
          <div
            style={{
              fontSize: 9,
              letterSpacing: '0.28em',
              color: 'rgba(237,233,227,0.35)',
              marginBottom: 4,
            }}
          >
            RECENT ACTIVITY
          </div>

          {activity.length === 0 ? (
            <div
              style={{
                marginTop: 32,
                fontFamily: "'Cormorant Garamond', Georgia, serif",
                fontSize: 20,
                fontStyle: 'italic',
                color: 'rgba(237,233,227,0.18)',
              }}
            >
              Nothing yet.
            </div>
          ) : (
            activity.map((a, i) => (
              <ActivityRow
                key={`${a.ts}-${i}`}
                label={a.label}
                sub={`${a.sub} · ${new Date(a.ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase()}`}
                index={i}
              />
            ))
          )}
        </div>
      </div>

      <style>{`
        @keyframes progressBar {
          0%   { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
      `}</style>
    </div>
  )
}
