import { useAuth0 } from '@auth0/auth0-react'
import type { Results } from '@mediapipe/holistic'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'

import { ApiClient } from '../services/api'
import type { ClothingCategory, ClothingItem } from '../types'
import { CameraLayer } from '../components/tryon/CameraLayer'
import { AROverlay } from '../components/tryon/AROverlay'
import { useHolistic } from '../components/tryon/useHolistic'

const apiBase = import.meta.env.VITE_API_URL || 'http://127.0.0.1:5000'
const categories: ClothingCategory[] = ['shirt', 'jacket', 'pants', 'shoes']

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export function VideoTryOnPage() {
  const { getAccessTokenSilently } = useAuth0()
  const api = useMemo(() => new ApiClient(apiBase, getAccessTokenSilently), [getAccessTokenSilently])
  const audience = import.meta.env.VITE_AUTH0_AUDIENCE

  const [catalog, setCatalog] = useState<ClothingItem[]>([])
  const [wardrobe, setWardrobe] = useState<ClothingItem[]>([])
  const [loadingItems, setLoadingItems] = useState(true)
  const [itemsErr, setItemsErr] = useState<string | null>(null)
  const [activeCategory, setActiveCategory] = useState<ClothingCategory>('shirt')
  const [sourceTab, setSourceTab] = useState<'catalog' | 'wardrobe'>('catalog')
  const [selected, setSelected] = useState<Record<ClothingCategory, ClothingItem | null>>({
    shirt: null,
    jacket: null,
    pants: null,
    shoes: null,
    accessory: null,
  })

  useEffect(() => {
    const run = async () => {
      setLoadingItems(true)
      setItemsErr(null)
      try {
        const [cat, wr] = await Promise.all([
          api.fetchJson<{ items: ClothingItem[] }>(`/catalog?limit=200`, {}, audience),
          api.fetchJson<{ items: ClothingItem[] }>(`/wardrobe`, {}, audience),
        ])
        setCatalog(cat.items)
        setWardrobe(wr.items)
      } catch (e) {
        setItemsErr(e instanceof Error ? e.message : 'Failed to load items')
      } finally {
        setLoadingItems(false)
      }
    }
    void run()
  }, [api, audience])

  const itemsForCategory = (sourceTab === 'catalog' ? catalog : wardrobe).filter(
    (i) => i.category === activeCategory,
  )

  const chosenItems = categories
    .map((c) => selected[c])
    .filter((x): x is ClothingItem => Boolean(x))

  // Recording
  const [cameraVideo, setCameraVideo] = useState<HTMLVideoElement | null>(null)
  const [cameraErr, setCameraErr] = useState<string | null>(null)
  const [recording, setRecording] = useState(false)
  const mediaRecRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<BlobPart[]>([])
  const [clipUrl, setClipUrl] = useState<string | null>(null)
  const clipBlobRef = useRef<Blob | null>(null)

  const stopRecording = useCallback(() => {
    try {
      mediaRecRef.current?.stop()
    } catch {
      /* ignore */
    }
  }, [])

  const startRecording = useCallback(async () => {
    if (!cameraVideo) return
    const stream = cameraVideo.srcObject as MediaStream | null
    if (!stream) return

    chunksRef.current = []
    const rec = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp8,opus' })
    mediaRecRef.current = rec
    rec.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) chunksRef.current.push(e.data)
    }
    rec.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: 'video/webm' })
      clipBlobRef.current = blob
      if (clipUrl) URL.revokeObjectURL(clipUrl)
      const url = URL.createObjectURL(blob)
      setClipUrl(url)
      setRecording(false)
      mediaRecRef.current = null
    }
    rec.start(250)
    setRecording(true)
    // Auto-stop after 10s for a quick test.
    window.setTimeout(() => {
      if (mediaRecRef.current === rec) stopRecording()
    }, 10_000)
  }, [cameraVideo, clipUrl, stopRecording])

  useEffect(() => {
    return () => {
      try {
        mediaRecRef.current?.stop()
      } catch {
        /* ignore */
      }
      if (clipUrl) URL.revokeObjectURL(clipUrl)
    }
  }, [clipUrl])

  // Export processing
  const [exporting, setExporting] = useState(false)
  const [exportErr, setExportErr] = useState<string | null>(null)
  const overlayCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const [pose, setPose] = useState<Results['poseLandmarks']>(null)

  const onResults = useCallback((r: Results) => {
    setPose(r.poseLandmarks ?? null)
  }, [])

  const playbackVideoRef = useRef<HTMLVideoElement | null>(null)
  const [playbackVideo, setPlaybackVideo] = useState<HTMLVideoElement | null>(null)
  const exportCanvasRef = useRef<HTMLCanvasElement | null>(null)

  const { ready: holisticReady, error: holisticError } = useHolistic({
    video: playbackVideo,
    onResults,
  })

  const processAndExport = useCallback(async () => {
    if (!clipUrl) return
    if (!exportCanvasRef.current) return
    if (!playbackVideoRef.current) return
    if (!overlayCanvasRef.current) return
    setExporting(true)
    setExportErr(null)

    const v = playbackVideoRef.current
    const c = exportCanvasRef.current
    const ctx = c.getContext('2d')
    if (!ctx) {
      setExportErr('Canvas unavailable')
      setExporting(false)
      return
    }

    // Ensure metadata loaded so videoWidth/Height exist.
    if (!v.videoWidth || !v.videoHeight) {
      await new Promise<void>((resolve) => {
        const onLoaded = () => resolve()
        v.addEventListener('loadedmetadata', onLoaded, { once: true })
      })
    }
    c.width = v.videoWidth || 720
    c.height = v.videoHeight || 1280

    const stream = c.captureStream(30)
    const rec = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp8' })
    const outChunks: BlobPart[] = []
    rec.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) outChunks.push(e.data)
    }

    const done = new Promise<Blob>((resolve) => {
      rec.onstop = () => resolve(new Blob(outChunks, { type: 'video/webm' }))
    })

    // Render loop: paint video + overlay canvas each frame.
    let raf: number | null = null
    const draw = () => {
      ctx.drawImage(v, 0, 0, c.width, c.height)
      ctx.drawImage(overlayCanvasRef.current!, 0, 0, c.width, c.height)
      raf = requestAnimationFrame(draw)
    }

    // Start playback from beginning.
    v.currentTime = 0
    await v.play().catch(() => undefined)
    rec.start(250)
    draw()

    await new Promise<void>((resolve) => {
      v.onended = () => resolve()
    })

    if (raf) cancelAnimationFrame(raf)
    try {
      rec.stop()
    } catch {
      /* ignore */
    }
    const out = await done
    downloadBlob(out, `fitdeck-tryon-${Date.now()}.webm`)
    setExporting(false)
  }, [clipUrl])

  return (
    <main className="page-shell pb-24 pt-10">
      <div className="glass-panel px-6 py-8 sm:px-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="section-kicker">Video try-on (prototype)</p>
            <h1 className="mt-4 font-display text-4xl text-white sm:text-5xl">Record → overlay → export</h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-zinc-300">
              This is a test harness for the “video + clothes → same video with new clothes” contract.
              It uses pose tracking and draws your selected items over each frame, then records the result.
            </p>
          </div>
          <Link to="/app" className="button-secondary">
            ← Back
          </Link>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <section className="rounded-2xl border border-white/10 bg-black/20 p-5">
            <p className="text-xs uppercase tracking-widest text-zinc-400">1) Pick items</p>

            <div className="mt-4 flex flex-wrap gap-2">
              {categories.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setActiveCategory(c)}
                  className={[
                    'rounded-full px-4 py-2 text-sm',
                    activeCategory === c
                      ? 'bg-violet-600 text-white'
                      : 'border border-white/10 bg-black/20 text-zinc-200 hover:bg-black/30',
                  ].join(' ')}
                >
                  {c}
                </button>
              ))}
            </div>

            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => setSourceTab('catalog')}
                className={[
                  'rounded-full px-4 py-2 text-sm',
                  sourceTab === 'catalog'
                    ? 'bg-white/10 text-white'
                    : 'border border-white/10 bg-black/20 text-zinc-300 hover:bg-black/30',
                ].join(' ')}
              >
                Catalog
              </button>
              <button
                type="button"
                onClick={() => setSourceTab('wardrobe')}
                className={[
                  'rounded-full px-4 py-2 text-sm',
                  sourceTab === 'wardrobe'
                    ? 'bg-white/10 text-white'
                    : 'border border-white/10 bg-black/20 text-zinc-300 hover:bg-black/30',
                ].join(' ')}
              >
                Wardrobe
              </button>
            </div>

            {loadingItems ? <p className="mt-4 text-sm text-zinc-400">Loading items…</p> : null}
            {itemsErr ? <p className="mt-4 text-sm text-amber-200">{itemsErr}</p> : null}

            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {itemsForCategory.slice(0, 24).map((i) => {
                const selectedId = selected[activeCategory]?.id
                const isSel = selectedId === i.id
                return (
                  <button
                    key={i.id}
                    type="button"
                    onClick={() =>
                      setSelected((s) => ({
                        ...s,
                        [activeCategory]: isSel ? null : i,
                      }))
                    }
                    className={[
                      'overflow-hidden rounded-2xl border text-left',
                      isSel ? 'border-violet-400 bg-violet-500/10' : 'border-white/10 bg-white/5',
                    ].join(' ')}
                  >
                    <div className="aspect-square w-full bg-black/20">
                      {i.image_url || i.try_on_asset ? (
                        <img
                          src={(i.try_on_asset || i.image_url) ?? ''}
                          alt={i.name}
                          className="h-full w-full object-cover"
                        />
                      ) : null}
                    </div>
                    <div className="p-3">
                      <p className="truncate text-xs text-zinc-400">{i.brand || '—'}</p>
                      <p className="mt-1 line-clamp-2 text-sm font-medium text-white">{i.name}</p>
                    </div>
                  </button>
                )
              })}
            </div>

            <div className="mt-5 rounded-xl border border-white/10 bg-black/20 p-4">
              <p className="text-xs uppercase tracking-widest text-zinc-400">Selected</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {categories.map((c) => (
                  <span
                    key={c}
                    className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-zinc-200"
                  >
                    {c}: {selected[c]?.name ?? '—'}
                  </span>
                ))}
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-white/10 bg-black/20 p-5">
            <p className="text-xs uppercase tracking-widest text-zinc-400">2) Record video</p>

            <div className="relative mt-4 aspect-[3/4] w-full overflow-hidden rounded-2xl border border-white/10 bg-black">
              <CameraLayer onReady={setCameraVideo} onError={setCameraErr} />
              {cameraErr ? (
                <div className="absolute inset-0 flex items-center justify-center p-6 text-center text-sm text-amber-200">
                  {cameraErr}
                </div>
              ) : null}
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={!cameraVideo || recording}
                onClick={() => void startRecording()}
                className="button-primary disabled:opacity-40"
              >
                {recording ? 'Recording…' : 'Start 10s recording'}
              </button>
              <button
                type="button"
                disabled={!recording}
                onClick={stopRecording}
                className="button-secondary disabled:opacity-40"
              >
                Stop
              </button>
              {clipBlobRef.current ? (
                <button
                  type="button"
                  className="button-ghost"
                  onClick={() => downloadBlob(clipBlobRef.current!, `fitdeck-raw-${Date.now()}.webm`)}
                >
                  Download raw clip
                </button>
              ) : null}
            </div>

            <div className="mt-6 border-t border-white/10 pt-6">
              <p className="text-xs uppercase tracking-widest text-zinc-400">3) Export with overlay</p>
              {!clipUrl ? (
                <p className="mt-3 text-sm text-zinc-400">Record a clip first.</p>
              ) : (
                <>
                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <div className="rounded-2xl border border-white/10 bg-black/30 p-3">
                      <p className="mb-2 text-xs text-zinc-500">Playback input</p>
                      <video
                        ref={playbackVideoRef}
                        src={clipUrl}
                        controls
                        playsInline
                        className="w-full rounded-xl"
                        onPlay={(e) => setPlaybackVideo(e.currentTarget)}
                      />
                      <p className="mt-2 text-xs text-zinc-500">
                        Pose model: {holisticReady ? 'ready' : 'loading…'}
                        {holisticError ? ` · ${holisticError}` : ''}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-black/30 p-3">
                      <p className="mb-2 text-xs text-zinc-500">Export canvas (records this)</p>
                      <canvas ref={exportCanvasRef} className="w-full rounded-xl bg-black" />
                      <p className="mt-2 text-xs text-zinc-500">
                        We composite: video frame + AR overlay each frame.
                      </p>
                    </div>
                  </div>

                  {/* Hidden overlay renderer used for compositing into export canvas */}
                  <div className="pointer-events-none absolute -left-[99999px] -top-[99999px] h-0 w-0 overflow-hidden">
                    <AROverlay
                      width={playbackVideo?.videoWidth || 720}
                      height={playbackVideo?.videoHeight || 1280}
                      poseLandmarks={pose}
                      items={chosenItems}
                      onCanvas={(c) => {
                        overlayCanvasRef.current = c
                      }}
                    />
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={exporting || !holisticReady || chosenItems.length === 0}
                      onClick={() => void processAndExport()}
                      className="button-primary disabled:opacity-40"
                    >
                      {exporting ? 'Exporting…' : 'Process & download try-on video'}
                    </button>
                    <button
                      type="button"
                      disabled={chosenItems.length === 0}
                      onClick={() => setSelected({ shirt: null, jacket: null, pants: null, shoes: null, accessory: null })}
                      className="button-secondary disabled:opacity-40"
                    >
                      Clear items
                    </button>
                    {exportErr ? <p className="text-sm text-amber-200">{exportErr}</p> : null}
                    {chosenItems.length === 0 ? (
                      <p className="text-sm text-zinc-400">Select at least 1 item to export.</p>
                    ) : null}
                  </div>
                </>
              )}
            </div>
          </section>
        </div>
      </div>
    </main>
  )
}

