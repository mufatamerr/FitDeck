import { useAuth0 } from '@auth0/auth0-react'
import { AnimatePresence, motion } from 'framer-motion'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { cloudinaryHQ } from '../lib/cloudinary'
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
        position: 'fixed', bottom: 32, right: 40,
        background: 'rgba(14,14,14,0.96)',
        border: '1px solid rgba(237,233,227,0.12)',
        padding: '14px 22px',
        fontSize: 10.5, letterSpacing: '0.12em', color: '#ede9e3',
        fontFamily: "'DM Sans', sans-serif", zIndex: 9999,
      }}
    >
      {message}
    </motion.div>
  )
}

/* ── Field (underline style) ── */
function Field({
  label, value, onChange, type = 'text', as,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  type?: string
  as?: 'select' | 'textarea'
}) {
  const base: React.CSSProperties = {
    width: '100%',
    background: 'transparent',
    border: 'none',
    borderBottom: '1px solid rgba(237,233,227,0.16)',
    padding: '12px 0',
    color: '#ede9e3',
    fontSize: 12,
    letterSpacing: '0.1em',
    outline: 'none',
    fontFamily: "'DM Sans', sans-serif",
    fontWeight: 300,
    marginTop: 4,
  }

  return (
    <div style={{ marginBottom: 24 }}>
      <label
        style={{
          display: 'block',
          fontSize: 8.5,
          letterSpacing: '0.28em',
          color: 'rgba(237,233,227,0.35)',
          textTransform: 'uppercase',
        }}
      >
        {label}
      </label>
      {as === 'select' ? (
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={{ ...base, appearance: 'none', cursor: 'pointer' }}
        >
          {CATEGORIES.map((c) => (
            <option key={c} value={c} style={{ background: '#0d0d0d' }}>
              {c.charAt(0).toUpperCase() + c.slice(1)}
            </option>
          ))}
        </select>
      ) : as === 'textarea' ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={2}
          style={{ ...base, resize: 'none' }}
        />
      ) : (
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={base}
        />
      )}
    </div>
  )
}

/* ── Add / Edit Drawer ── */
function AddDrawer({
  open,
  onClose,
  onSuccess,
  api,
  audience,
}: {
  open: boolean
  onClose: () => void
  onSuccess: () => void
  api: ApiClient
  audience: string
}) {
  const [draftId, setDraftId]   = useState<string | null>(null)
  const [draftExt, setDraftExt] = useState('.jpg')
  const [name, setName]         = useState('')
  const [brand, setBrand]       = useState('')
  const [category, setCategory] = useState('shirt')
  const [styleTags, setStyleTags] = useState('')
  const [colorTags, setColorTags] = useState('')
  const [tryOnFile, setTryOnFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [drafting, setDrafting] = useState(false)
  const [committing, setCommitting] = useState(false)
  const [draftErr, setDraftErr] = useState<string | null>(null)
  const [commitErr, setCommitErr] = useState<string | null>(null)
  const [visionNote, setVisionNote] = useState<string | null>(null)

  const reset = () => {
    setDraftId(null); setName(''); setBrand(''); setCategory('shirt')
    setStyleTags(''); setColorTags(''); setTryOnFile(null); setVisionNote(null)
    setDraftErr(null); setCommitErr(null)
    setPreviewUrl((p) => { if (p) URL.revokeObjectURL(p); return null })
  }

  const onPickImage = async (file: File | null) => {
    if (!file) return
    setDraftErr(null); setCommitErr(null); setVisionNote(null)
    setDrafting(true)
    try {
      const form = new FormData()
      form.append('image', file)
      const d = await api.postFormData<DraftResponse>('/admin/catalog/draft', form, audience)
      setDraftId(d.draft_id); setDraftExt(d.ext); setName(d.suggested_name)
      setCategory(d.suggested_category)
      setStyleTags(d.style_tags.join(', ')); setColorTags(d.color_tags.join(', '))
      if (d.vision_error) setVisionNote(d.vision_error)
      const url = URL.createObjectURL(file)
      setPreviewUrl((p) => { if (p) URL.revokeObjectURL(p); return url })
    } catch (e) {
      setDraftErr(e instanceof Error ? e.message : 'Draft failed')
    } finally {
      setDrafting(false)
    }
  }

  const onCommit = async () => {
    if (!draftId) { setCommitErr('Choose an image first.'); return }
    setCommitting(true); setCommitErr(null)
    try {
      const form = new FormData()
      form.append('draft_id', draftId); form.append('ext', draftExt)
      form.append('name', name); form.append('brand', brand)
      form.append('category', category); form.append('style_tags', styleTags)
      form.append('color_tags', colorTags)
      if (tryOnFile) form.append('try_on_asset', tryOnFile)
      await api.postFormData<{ item: { id: string } }>('/admin/catalog/commit', form, audience)
      reset(); onSuccess(); onClose()
    } catch (e) {
      setCommitErr(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setCommitting(false)
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Scrim */}
          <motion.div
            key="scrim"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            style={{
              position: 'fixed', inset: 0,
              background: 'rgba(0,0,0,0.55)',
              zIndex: 199,
            }}
          />

          {/* Drawer */}
          <motion.div
            key="drawer"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            style={{
              position: 'fixed', right: 0, top: 0, bottom: 0,
              width: 480, background: '#0d0d0d',
              borderLeft: '1px solid rgba(237,233,227,0.07)',
              zIndex: 200, padding: '48px 40px',
              overflowY: 'auto',
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            {/* Drawer header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 40 }}>
              <h2
                style={{
                  fontFamily: "'Cormorant Garamond', Georgia, serif",
                  fontSize: 30, fontWeight: 300, fontStyle: 'italic',
                  color: '#ede9e3', margin: 0,
                }}
              >
                Add Item
              </h2>
              <button
                onClick={onClose}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  fontSize: 10, letterSpacing: '0.2em',
                  color: 'rgba(237,233,227,0.3)', fontFamily: "'DM Sans', sans-serif",
                  padding: 0, marginTop: 6,
                }}
              >
                CLOSE
              </button>
            </div>

            {/* Image upload */}
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 8.5, letterSpacing: '0.28em', color: 'rgba(237,233,227,0.35)' }}>
                IMAGE
              </div>

              <label
                style={{
                  display: 'block', marginTop: 8,
                  border: '1px dashed rgba(237,233,227,0.15)',
                  padding: '20px', cursor: 'pointer',
                  textAlign: 'center', transition: 'border-color 150ms ease-out',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'rgba(237,233,227,0.35)')}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'rgba(237,233,227,0.15)')}
              >
                {previewUrl ? (
                  <img
                    src={previewUrl}
                    alt="Preview"
                    style={{ maxHeight: 140, maxWidth: '100%', objectFit: 'contain', display: 'block', margin: '0 auto' }}
                  />
                ) : (
                  <span style={{ fontSize: 10, letterSpacing: '0.2em', color: 'rgba(237,233,227,0.28)' }}>
                    {drafting ? 'ANALYZING…' : 'CLICK TO UPLOAD'}
                  </span>
                )}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  style={{ display: 'none' }}
                  onChange={(e) => void onPickImage(e.target.files?.[0] ?? null)}
                  disabled={drafting}
                />
              </label>

              {draftErr && (
                <p style={{ marginTop: 8, fontSize: 10, letterSpacing: '0.1em', color: 'rgba(200,160,80,0.7)' }}>
                  {draftErr}
                </p>
              )}
              {visionNote && (
                <p style={{ marginTop: 6, fontSize: 9, letterSpacing: '0.1em', color: 'rgba(237,233,227,0.28)' }}>
                  Vision: {visionNote}
                </p>
              )}
            </div>

            {/* Fields */}
            <Field label="Name"     value={name}      onChange={setName} />
            <Field label="Brand"    value={brand}     onChange={setBrand} />
            <Field label="Category" value={category}  onChange={setCategory} as="select" />
            <Field label="Style Tags (comma-separated)"  value={styleTags}  onChange={setStyleTags} as="textarea" />
            <Field label="Color Tags (comma-separated)"  value={colorTags}  onChange={setColorTags} as="textarea" />

            {/* Try-on PNG */}
            <div style={{ marginBottom: 32 }}>
              <div style={{ fontSize: 8.5, letterSpacing: '0.28em', color: 'rgba(237,233,227,0.35)' }}>
                TRY-ON PNG (OPTIONAL)
              </div>
              <input
                type="file"
                accept="image/png"
                onChange={(e) => setTryOnFile(e.target.files?.[0] ?? null)}
                style={{
                  marginTop: 8, width: '100%', fontSize: 10.5,
                  color: 'rgba(237,233,227,0.5)',
                  fontFamily: "'DM Sans', sans-serif",
                }}
              />
              {tryOnFile && (
                <div style={{ marginTop: 4, fontSize: 9, color: 'rgba(237,233,227,0.35)', letterSpacing: '0.1em' }}>
                  {tryOnFile.name}
                </div>
              )}
            </div>

            {commitErr && (
              <p style={{ marginBottom: 16, fontSize: 10, letterSpacing: '0.1em', color: 'rgba(200,160,80,0.7)' }}>
                {commitErr}
              </p>
            )}

            {/* Actions */}
            <div style={{ display: 'flex', gap: 3 }}>
              <button
                disabled={!draftId || committing}
                onClick={() => void onCommit()}
                style={{
                  flex: 1, background: '#ede9e3', color: '#070707',
                  border: 'none', padding: '18px',
                  fontSize: 10.5, letterSpacing: '0.22em',
                  fontFamily: "'DM Sans', sans-serif", cursor: 'pointer',
                  fontWeight: 500, opacity: (!draftId || committing) ? 0.38 : 1,
                  transition: 'opacity 150ms ease-out',
                }}
              >
                {committing ? 'PUBLISHING…' : 'PUBLISH'}
              </button>
              <button
                onClick={() => { reset(); onClose() }}
                style={{
                  background: 'transparent', color: '#ede9e3',
                  border: '1px solid rgba(255,255,255,0.18)',
                  padding: '18px 28px',
                  fontSize: 10.5, letterSpacing: '0.22em',
                  fontFamily: "'DM Sans', sans-serif", cursor: 'pointer', fontWeight: 300,
                }}
              >
                CANCEL
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

/* ── Catalog Item Card ── */
function CatalogCard({
  item,
  onToggle,
  index,
}: {
  item: CatalogRow
  onToggle: (r: CatalogRow) => void
  index: number
}) {
  const [hovered, setHovered] = useState(false)

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      style={{
        border: '1px solid rgba(237,233,227,0.07)',
        background: 'rgba(255,255,255,0.02)',
        overflow: 'hidden',
        position: 'relative',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Image */}
      <div style={{ aspectRatio: '3/4', overflow: 'hidden', background: '#0d0d0d' }}>
        {item.image_url ? (
          <img
            src={cloudinaryHQ(item.image_url, { width: 1200, quality: 'auto:best', sharpen: 80, dpr: '2.0' })}
            alt={item.name}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              filter: hovered
                ? 'saturate(1) brightness(0.95)'
                : 'saturate(0.7) brightness(0.8)',
              transform: hovered ? 'scale(1.03)' : 'scale(1)',
              transition: 'filter 250ms ease-out, transform 250ms ease-out',
            }}
          />
        ) : (
          <div
            style={{
              width: '100%', height: '100%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <span style={{ fontSize: 9, letterSpacing: '0.24em', color: 'rgba(237,233,227,0.18)' }}>
              NO IMAGE
            </span>
          </div>
        )}

        {/* Status badge */}
        {!item.is_active && (
          <div
            style={{
              position: 'absolute', top: 12, left: 12,
              fontSize: 8, letterSpacing: '0.22em',
              color: 'rgba(200,160,80,0.7)',
              background: 'rgba(7,7,7,0.7)',
              padding: '4px 8px',
            }}
          >
            INACTIVE
          </div>
        )}

        {/* Hover actions */}
        <AnimatePresence>
          {hovered && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              style={{
                position: 'absolute', bottom: 12, right: 12,
                display: 'flex', gap: 12,
              }}
            >
              <button
                onClick={() => onToggle(item)}
                style={{
                  background: 'rgba(7,7,7,0.8)',
                  border: 'none', cursor: 'pointer',
                  fontSize: 8.5, letterSpacing: '0.2em',
                  color: item.is_active ? 'rgba(200,160,80,0.8)' : 'rgba(237,233,227,0.7)',
                  fontFamily: "'DM Sans', sans-serif",
                  padding: '6px 12px',
                }}
              >
                {item.is_active ? 'DEACTIVATE' : 'ACTIVATE'}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Info */}
      <div style={{ padding: '14px 16px 16px' }}>
        <div
          style={{
            fontFamily: "'Cormorant Garamond', Georgia, serif",
            fontSize: 16, fontWeight: 300,
            color: '#ede9e3', letterSpacing: '0.01em',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}
        >
          {item.name}
        </div>
        <div
          style={{
            marginTop: 4, fontSize: 9, letterSpacing: '0.22em',
            color: 'rgba(237,233,227,0.35)',
          }}
        >
          {item.category.toUpperCase()}
          {item.brand ? ` · ${item.brand.toUpperCase()}` : ''}
        </div>
      </div>
    </motion.div>
  )
}

/* ── Page ── */
export function AdminCatalogPage() {
  const { getAccessTokenSilently } = useAuth0()
  const api = useMemo(() => new ApiClient(apiBase, getAccessTokenSilently), [getAccessTokenSilently])
  const audience = import.meta.env.VITE_AUTH0_AUDIENCE

  const [rows, setRows]         = useState<CatalogRow[]>([])
  const [listErr, setListErr]   = useState<string | null>(null)
  const [listLoading, setListLoading] = useState(true)
  const [search, setSearch]     = useState('')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [toast, setToast]       = useState<string | null>(null)

  const loadList = useCallback(async () => {
    setListLoading(true); setListErr(null)
    try {
      const data = await api.fetchJson<{ items: CatalogRow[] }>('/admin/catalog', {}, audience)
      setRows(data.items)
    } catch (e) {
      setListErr(e instanceof Error ? e.message : 'Failed to load catalog')
    } finally {
      setListLoading(false)
    }
  }, [api, audience])

  useEffect(() => { void loadList() }, [loadList])

  const toggleActive = async (row: CatalogRow) => {
    try {
      await api.fetchJson(
        `/admin/catalog/${row.id}`,
        { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ is_active: !row.is_active }) },
        audience,
      )
      await loadList()
      setToast(`${row.name} ${row.is_active ? 'deactivated' : 'activated'}`)
    } catch { /* ignore */ }
  }

  const filtered = rows.filter((r) => {
    const q = search.toLowerCase()
    return r.name.toLowerCase().includes(q) || (r.brand ?? '').toLowerCase().includes(q) || r.category.toLowerCase().includes(q)
  })

  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif", color: '#ede9e3' }}>
      {/* Header */}
      <div style={{ marginBottom: 40 }}>
        <h1
          style={{
            fontFamily: "'Cormorant Garamond', Georgia, serif",
            fontSize: 42, fontWeight: 300, fontStyle: 'italic',
            color: '#ede9e3', letterSpacing: '-0.01em', lineHeight: 1, margin: 0,
          }}
        >
          Catalog
        </h1>
        <div
          style={{ marginTop: 10, fontSize: 8.5, letterSpacing: '0.28em', color: 'rgba(237,233,227,0.3)' }}
        >
          {rows.length.toLocaleString()} ITEMS · {rows.filter((r) => r.is_active).length.toLocaleString()} ACTIVE
        </div>
      </div>

      {/* Toolbar */}
      <div
        style={{
          display: 'flex', alignItems: 'flex-end',
          justifyContent: 'space-between', marginBottom: 36, gap: 16,
        }}
      >
        <input
          type="text"
          placeholder="SEARCH CATALOG"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input-underline"
          style={{ width: 280 }}
        />
        <div style={{ display: 'flex', gap: 3 }}>
          <button
            style={{
              background: 'transparent',
              border: '1px solid rgba(237,233,227,0.18)',
              color: 'rgba(237,233,227,0.55)',
              padding: '11px 24px', fontSize: 10.5, letterSpacing: '0.22em',
              fontFamily: "'DM Sans', sans-serif", cursor: 'pointer', fontWeight: 300,
            }}
          >
            FILTER
          </button>
          <button
            onClick={() => setDrawerOpen(true)}
            style={{
              background: '#ede9e3', color: '#070707',
              border: 'none', padding: '11px 28px',
              fontSize: 10.5, letterSpacing: '0.22em',
              fontFamily: "'DM Sans', sans-serif",
              cursor: 'pointer', fontWeight: 500,
              transition: 'opacity 150ms ease-out',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.82')}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
          >
            + ADD ITEM
          </button>
        </div>
      </div>

      {/* Loading */}
      {listLoading && (
        <div
          style={{
            height: 1,
            background: 'linear-gradient(to right, transparent, rgba(237,233,227,0.4), transparent)',
            marginBottom: 24,
          }}
        />
      )}

      {listErr && (
        <p style={{ fontSize: 10.5, letterSpacing: '0.12em', color: 'rgba(200,160,80,0.7)', marginBottom: 24 }}>
          {listErr}
        </p>
      )}

      {/* Grid */}
      {!listLoading && filtered.length === 0 ? (
        <div style={{ paddingTop: 80, textAlign: 'center' }}>
          <div
            style={{
              fontFamily: "'Cormorant Garamond', Georgia, serif",
              fontSize: 28, fontStyle: 'italic',
              color: 'rgba(237,233,227,0.18)',
            }}
          >
            {search ? 'No matches.' : 'No items yet.'}
          </div>
          {!search && (
            <button
              onClick={() => setDrawerOpen(true)}
              style={{
                marginTop: 24, background: 'none', border: 'none',
                cursor: 'pointer', fontSize: 10, letterSpacing: '0.22em',
                color: 'rgba(237,233,227,0.35)', fontFamily: "'DM Sans', sans-serif",
                textDecoration: 'underline', padding: 0,
              }}
            >
              ADD FIRST ITEM
            </button>
          )}
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
            gap: 3,
          }}
        >
          {filtered.map((r, i) => (
            <CatalogCard key={r.id} item={r} onToggle={toggleActive} index={i} />
          ))}
        </div>
      )}

      {/* Add Drawer */}
      <AddDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onSuccess={() => { void loadList(); setToast('Item published to catalog') }}
        api={api}
        audience={audience}
      />

      {/* Toast */}
      <AnimatePresence>
        {toast && <Toast message={toast} onDone={() => setToast(null)} />}
      </AnimatePresence>
    </div>
  )
}
