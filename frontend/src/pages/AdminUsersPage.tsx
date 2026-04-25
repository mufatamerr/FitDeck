import { useAuth0 } from '@auth0/auth0-react'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

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

export function AdminUsersPage() {
  const { getAccessTokenSilently } = useAuth0()
  const api = useMemo(() => new ApiClient(apiBase, getAccessTokenSilently), [getAccessTokenSilently])
  const [rows, setRows] = useState<Row[]>([])
  const [err, setErr] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const run = async () => {
      setLoading(true)
      setErr(null)
      try {
        const audience = import.meta.env.VITE_AUTH0_AUDIENCE
        const data = await api.fetchJson<{ users: Row[] }>('/admin/users', {}, audience)
        setRows(data.users)
      } catch (e) {
        setErr(e instanceof Error ? e.message : 'Failed')
      } finally {
        setLoading(false)
      }
    }
    void run()
  }, [api])

  return (
    <div className="min-h-dvh px-6 py-10">
      <div className="mx-auto max-w-5xl">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-widest text-violet-300/90">Admin</p>
            <h1 className="mt-2 font-display text-3xl text-white">Users</h1>
            <p className="mt-2 text-sm text-zinc-400">
              Requires access token claim <code>role=admin</code>.
            </p>
          </div>
          <Link
            to="/app"
            className="rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-sm text-white hover:bg-white/10"
          >
            ← Home
          </Link>
        </div>

        <div className="mt-8">
          {loading && <p className="text-sm text-zinc-400">Loading…</p>}
          {!loading && err && <p className="text-sm text-amber-200">{err}</p>}

          <div className="mt-6 overflow-hidden rounded-2xl border border-white/10">
            <table className="w-full text-left text-sm">
              <thead className="bg-white/5 text-xs uppercase tracking-wider text-zinc-400">
                <tr>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Onboarding</th>
                  <th className="px-4 py-3">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {rows.map((r) => (
                  <tr key={r.auth0_id} className="bg-black/20 text-zinc-200">
                    <td className="px-4 py-3">{r.email || '—'}</td>
                    <td className="px-4 py-3">{r.role}</td>
                    <td className="px-4 py-3">{r.onboarding_done ? 'Yes' : 'No'}</td>
                    <td className="px-4 py-3 text-zinc-400">
                      {new Date(r.created_at).toLocaleString()}
                    </td>
                  </tr>
                ))}
                {!loading && !err && rows.length === 0 && (
                  <tr>
                    <td className="px-4 py-6 text-zinc-400" colSpan={4}>
                      No users yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

