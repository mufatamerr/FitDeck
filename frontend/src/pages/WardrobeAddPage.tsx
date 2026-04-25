import { useAuth0 } from '@auth0/auth0-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

const apiBase = import.meta.env.VITE_API_URL || 'http://127.0.0.1:5000'

export function WardrobeAddPage() {
  const { getAccessTokenSilently } = useAuth0()
  const nav = useNavigate()

  const [file, setFile] = useState<File | null>(null)
  const [name, setName] = useState('')
  const [brand, setBrand] = useState('')
  const [category, setCategory] = useState('shirt')
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [result, setResult] = useState<Record<string, unknown> | null>(null)

  const upload = async () => {
    if (!file) return
    setLoading(true)
    setErr(null)
    setResult(null)
    try {
      const audience = import.meta.env.VITE_AUTH0_AUDIENCE
      const token = await getAccessTokenSilently(
        audience ? { authorizationParams: { audience } } : undefined,
      )
      const form = new FormData()
      form.append('image', file)
      if (name) form.append('name', name)
      if (brand) form.append('brand', brand)
      if (category) form.append('category', category)

      const res = await fetch(`${apiBase}/wardrobe/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.detail || data?.error || `HTTP ${res.status}`)
      setResult(data)
      setTimeout(() => nav('/app/wardrobe'), 600)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Upload failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-dvh px-6 py-10">
      <div className="mx-auto max-w-xl">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-widest text-violet-300/90">My Wardrobe</p>
            <h1 className="mt-2 font-display text-3xl text-white">Add item</h1>
          </div>
          <Link
            to="/app/wardrobe"
            className="rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-sm text-white hover:bg-white/10"
          >
            ← Back
          </Link>
        </div>

        <div className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-6">
          <label className="block text-sm text-zinc-300">Photo</label>
          <input
            type="file"
            accept="image/*"
            className="mt-2 block w-full text-sm text-zinc-300 file:mr-4 file:rounded-lg file:border-0 file:bg-violet-600 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-violet-500"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />

          <div className="mt-6 grid grid-cols-1 gap-4">
            <div>
              <label className="block text-sm text-zinc-300">Name</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Blue denim jacket"
                className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white placeholder:text-zinc-500"
              />
            </div>
            <div>
              <label className="block text-sm text-zinc-300">Brand (optional)</label>
              <input
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                placeholder="e.g. Levi's"
                className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white placeholder:text-zinc-500"
              />
            </div>
            <div>
              <label className="block text-sm text-zinc-300">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white"
              >
                <option value="shirt">Shirt</option>
                <option value="jacket">Jacket</option>
                <option value="pants">Pants</option>
                <option value="shoes">Shoes</option>
                <option value="accessory">Accessory</option>
              </select>
            </div>
          </div>

          {err && <p className="mt-4 text-sm text-amber-200">{err}</p>}
          {result && (
            <pre className="mt-4 overflow-x-auto rounded-xl border border-white/10 bg-black/30 p-3 text-xs text-emerald-200/90">
              {JSON.stringify(result, null, 2)}
            </pre>
          )}

          <button
            type="button"
            onClick={() => void upload()}
            disabled={!file || loading}
            className="mt-6 w-full rounded-xl bg-violet-600 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"
          >
            {loading ? 'Uploading…' : 'Upload'}
          </button>
        </div>
      </div>
    </div>
  )
}

