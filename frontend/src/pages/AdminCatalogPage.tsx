import { useAuth0 } from '@auth0/auth0-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

import { ApiClient } from '../services/api'

const apiBase = import.meta.env.VITE_API_URL || 'http://127.0.0.1:5000'

type CatalogRow = {
  id: string
  name: string
  brand?: string | null
  category: string
  image_url?: string | null
  try_on_asset?: string | null
  style_tags: string[]
  color_tags: string[]
  is_active: boolean
  created_at: string
}

type DraftResponse = {
  draft_id: string
  ext: string
  suggested_name: string
  suggested_category: string
  style_tags: string[]
  color_tags: string[]
  vision_error?: string | null
}

const CATEGORIES = ['shirt', 'pants', 'jacket', 'shoes', 'accessory']

export function AdminCatalogPage() {
  const { getAccessTokenSilently } = useAuth0()
  const api = useMemo(() => new ApiClient(apiBase, getAccessTokenSilently), [getAccessTokenSilently])
  const audience = import.meta.env.VITE_AUTH0_AUDIENCE

  const [rows, setRows] = useState<CatalogRow[]>([])
  const [listErr, setListErr] = useState<string | null>(null)
  const [listLoading, setListLoading] = useState(true)

  const [draftId, setDraftId] = useState<string | null>(null)
  const [draftExt, setDraftExt] = useState<string>('.jpg')
  const [name, setName] = useState('')
  const [brand, setBrand] = useState('')
  const [category, setCategory] = useState('shirt')
  const [styleTags, setStyleTags] = useState('')
  const [colorTags, setColorTags] = useState('')
  const [tryOnFile, setTryOnFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  const [draftErr, setDraftErr] = useState<string | null>(null)
  const [commitErr, setCommitErr] = useState<string | null>(null)
  const [drafting, setDrafting] = useState(false)
  const [committing, setCommitting] = useState(false)
  const [visionNote, setVisionNote] = useState<string | null>(null)

  const loadList = useCallback(async () => {
    setListLoading(true)
    setListErr(null)
    try {
      const data = await api.fetchJson<{ items: CatalogRow[] }>('/admin/catalog', {}, audience)
      setRows(data.items)
    } catch (e) {
      setListErr(e instanceof Error ? e.message : 'Failed to load catalog')
    } finally {
      setListLoading(false)
    }
  }, [api, audience])

  useEffect(() => {
    void loadList()
  }, [loadList])

  const onPickImage = async (file: File | null) => {
    if (!file) return
    setDraftErr(null)
    setCommitErr(null)
    setVisionNote(null)
    setTryOnFile(null)
    setDrafting(true)
    try {
      const form = new FormData()
      form.append('image', file)
      const d = await api.postFormData<DraftResponse>('/admin/catalog/draft', form, audience)
      setDraftId(d.draft_id)
      setDraftExt(d.ext)
      setName(d.suggested_name)
      setCategory(d.suggested_category)
      setStyleTags(d.style_tags.join(', '))
      setColorTags(d.color_tags.join(', '))
      if (d.vision_error) setVisionNote(d.vision_error)
      const url = URL.createObjectURL(file)
      setPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev)
        return url
      })
    } catch (e) {
      setDraftErr(e instanceof Error ? e.message : 'Draft failed')
    } finally {
      setDrafting(false)
    }
  }

  const resetForm = () => {
    setDraftId(null)
    setName('')
    setBrand('')
    setCategory('shirt')
    setStyleTags('')
    setColorTags('')
    setTryOnFile(null)
    setVisionNote(null)
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return null
    })
  }

  const onCommit = async () => {
    if (!draftId) {
      setCommitErr('Choose an image first (draft).')
      return
    }
    setCommitting(true)
    setCommitErr(null)
    try {
      const form = new FormData()
      form.append('draft_id', draftId)
      form.append('ext', draftExt)
      form.append('name', name)
      form.append('brand', brand)
      form.append('category', category)
      form.append('style_tags', styleTags)
      form.append('color_tags', colorTags)
      if (tryOnFile) form.append('try_on_asset', tryOnFile)
      await api.postFormData<{ item: { id: string } }>('/admin/catalog/commit', form, audience)
      resetForm()
      await loadList()
    } catch (e) {
      setCommitErr(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setCommitting(false)
    }
  }

  const toggleActive = async (row: CatalogRow) => {
    try {
      await api.fetchJson(
        `/admin/catalog/${row.id}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ is_active: !row.is_active }),
        },
        audience,
      )
      await loadList()
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="min-h-dvh px-6 py-10">
      <div className="mx-auto max-w-5xl">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-widest text-violet-300/90">Admin</p>
            <h1 className="mt-2 font-display text-3xl text-white">Catalog</h1>
            <p className="mt-2 max-w-xl text-sm text-zinc-400">
              Upload a product image, review Vision suggestions, then publish to the Discover
              catalog. Optional transparent PNG for try-on (same flow as wardrobe).
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              to="/admin/users"
              className="rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-sm text-white hover:bg-white/10"
            >
              Users
            </Link>
            <Link
              to="/app"
              className="rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-sm text-white hover:bg-white/10"
            >
              ← Home
            </Link>
          </div>
        </div>

        <div className="mt-10 grid gap-10 lg:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-black/25 p-6">
            <h2 className="text-lg font-semibold text-white">Add item</h2>
            <label className="mt-4 block text-xs uppercase tracking-wider text-zinc-500">
              Image
            </label>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="mt-2 block w-full text-sm text-zinc-300 file:mr-4 file:rounded-lg file:border-0 file:bg-violet-600 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white"
              onChange={(e) => void onPickImage(e.target.files?.[0] ?? null)}
              disabled={drafting}
            />
            {drafting && <p className="mt-2 text-sm text-zinc-400">Analyzing image…</p>}
            {draftErr && <p className="mt-2 text-sm text-amber-200">{draftErr}</p>}
            {visionNote && (
              <p className="mt-2 text-xs text-zinc-500">Vision: {visionNote}</p>
            )}

            {previewUrl && (
              <div className="mt-4">
                <img
                  src={previewUrl}
                  alt="Preview"
                  className="max-h-48 w-auto rounded-lg border border-white/10 object-contain"
                />
              </div>
            )}

            <div className="mt-6 space-y-4">
              <div>
                <label className="text-xs uppercase tracking-wider text-zinc-500">Name</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white outline-none focus:border-violet-500/50"
                />
              </div>
              <div>
                <label className="text-xs uppercase tracking-wider text-zinc-500">Brand</label>
                <input
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white outline-none focus:border-violet-500/50"
                />
              </div>
              <div>
                <label className="text-xs uppercase tracking-wider text-zinc-500">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white outline-none focus:border-violet-500/50"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs uppercase tracking-wider text-zinc-500">
                  Style tags (comma-separated)
                </label>
                <textarea
                  value={styleTags}
                  onChange={(e) => setStyleTags(e.target.value)}
                  rows={2}
                  className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white outline-none focus:border-violet-500/50"
                />
              </div>
              <div>
                <label className="text-xs uppercase tracking-wider text-zinc-500">
                  Color tags (comma-separated)
                </label>
                <textarea
                  value={colorTags}
                  onChange={(e) => setColorTags(e.target.value)}
                  rows={2}
                  className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white outline-none focus:border-violet-500/50"
                />
              </div>
              <div>
                <label className="text-xs uppercase tracking-wider text-zinc-500">
                  Try-on PNG (optional)
                </label>
                <input
                  type="file"
                  accept="image/png"
                  className="mt-2 block w-full text-sm text-zinc-300 file:mr-4 file:rounded-lg file:border-0 file:bg-white/10 file:px-4 file:py-2 file:text-sm file:text-white"
                  onChange={(e) => setTryOnFile(e.target.files?.[0] ?? null)}
                />
              </div>
            </div>

            {commitErr && <p className="mt-4 text-sm text-amber-200">{commitErr}</p>}

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                disabled={!draftId || committing}
                onClick={() => void onCommit()}
                className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {committing ? 'Saving…' : 'Publish to catalog'}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="rounded-lg border border-white/15 px-4 py-2 text-sm text-zinc-300 hover:bg-white/5"
              >
                Clear
              </button>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Catalog items</h2>
              <button
                type="button"
                onClick={() => void loadList()}
                className="text-sm text-violet-300 hover:text-violet-200"
              >
                Refresh
              </button>
            </div>
            {listLoading && <p className="mt-4 text-sm text-zinc-400">Loading…</p>}
            {listErr && <p className="mt-4 text-sm text-amber-200">{listErr}</p>}
            <div className="mt-4 space-y-3">
              {rows.map((r) => (
                <div
                  key={r.id}
                  className="flex gap-3 rounded-xl border border-white/10 bg-black/20 p-3"
                >
                  {r.image_url && (
                    <img
                      src={r.image_url}
                      alt=""
                      className="h-16 w-16 shrink-0 rounded-lg object-cover"
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-white">{r.name}</p>
                    <p className="text-xs text-zinc-500">
                      {r.category}
                      {r.brand ? ` · ${r.brand}` : ''}
                    </p>
                    <button
                      type="button"
                      onClick={() => void toggleActive(r)}
                      className="mt-2 text-xs text-violet-300 hover:text-violet-200"
                    >
                      {r.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                  </div>
                </div>
              ))}
              {!listLoading && !listErr && rows.length === 0 && (
                <p className="text-sm text-zinc-500">No catalog rows yet.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
