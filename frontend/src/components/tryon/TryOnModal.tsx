import { useAuth0 } from '@auth0/auth0-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { useUiStore } from '../../store/uiStore'
import { ApiClient } from '../../services/api'
import type { ClothingCategory, ClothingItem, Outfit } from '../../types'
import { TryOnCamera } from './TryOnCamera'
import { TryOnLoader } from './TryOnLoader'
import { TryOnResult } from './TryOnResult'
import { useHandGestures } from './useHandGestures'
import { useHands } from './useHands'

const apiBase = import.meta.env.VITE_API_URL || 'http://127.0.0.1:5000'

type AppState = 'camera' | 'loading' | 'result'

type Props = {
  outfitQueue: Outfit[]
  startIndex?: number
  onClose: () => void
  onSaveOutfit: (outfit: Outfit) => Promise<void> | void
  onSkipOutfit?: (outfit: Outfit) => void
}

function primaryGarment(items: ClothingItem[]): ClothingItem | null {
  return (
    items.find((i) => i.category === 'shirt') ??
    items.find((i) => i.category === 'jacket') ??
    items.find((i) => i.category === 'pants') ??
    items[0] ??
    null
  )
}

function captureFrame(video: HTMLVideoElement): string {
  const c = document.createElement('canvas')
  c.width  = video.videoWidth  || 1280
  c.height = video.videoHeight || 720
  c.getContext('2d')!.drawImage(video, 0, 0)
  return c.toDataURL('image/jpeg', 0.97)
}

// Always fetch and convert to base64 — gives Fashn the raw bytes at full quality
// regardless of what the CDN might serve or compress.
async function garmentToFashnSrc(url: string): Promise<string> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Failed to fetch garment image: ${res.status}`)
  const blob = await res.blob()
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload  = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

export function TryOnModal({
  outfitQueue,
  startIndex = 0,
  onClose,
  onSaveOutfit,
  onSkipOutfit,
}: Props) {
  const navigate = useNavigate()
  const setVoiceWakeBlocked = useUiStore((s) => s.setVoiceWakeBlocked)
  const { getAccessTokenSilently } = useAuth0()
  const api = useMemo(
    () => new ApiClient(apiBase, getAccessTokenSilently),
    [getAccessTokenSilently],
  )

  useEffect(() => {
    setVoiceWakeBlocked(true)
    return () => setVoiceWakeBlocked(false)
  }, [setVoiceWakeBlocked])

  // ── Webcam + skeleton overlay ────────────────────────────────────────────
  const videoRef       = useRef<HTMLVideoElement>(null)
  const skeletonRef    = useRef<HTMLCanvasElement>(null)
  const skeletonPipRef = useRef<HTMLCanvasElement>(null)
  const [cameraReady, setCameraReady] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)

  useEffect(() => {
    let stream: MediaStream | null = null
    let cancelled = false
    const start = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        })
        if (cancelled || !videoRef.current) return
        videoRef.current.srcObject = stream
        try { await videoRef.current.play() } catch { /* StrictMode double-mount */ }
        if (!cancelled) setCameraReady(true)
      } catch (e) {
        if (!cancelled) setCameraError(e instanceof Error ? e.message : 'Camera permission denied')
      }
    }
    void start()
    return () => {
      cancelled = true
      stream?.getTracks().forEach((t) => t.stop())
    }
  }, [])

  // ── App state ─────────────────────────────────────────────────────────────
  const [appState, setAppState]        = useState<AppState>('camera')
  const [idx, setIdx]                  = useState(startIndex)
  const [snapshotDataUrl, setSnapshot] = useState('')
  const [resultUrl, setResultUrl]      = useState<string | null>(null)
  const [generateError, setError]      = useState<string | null>(null)
  const [saving, setSaving]            = useState(false)
  const [countdown, setCountdown]      = useState<number | null>(null)
  const [loadingStep, setLoadingStep]  = useState<{ current: number; total: number } | null>(null)

  const appStateRef  = useRef(appState)
  appStateRef.current = appState
  const countdownRef = useRef(countdown)
  countdownRef.current = countdown

  const outfit = outfitQueue[idx]

  // ── Countdown (fist gesture or button → 3-2-1 → snap) ────────────────────
  const startCountdown = useCallback(() => {
    if (countdownRef.current !== null || appStateRef.current !== 'camera') return
    setCountdown(3)
  }, [])

  useEffect(() => {
    if (countdown === null) return
    if (countdown === 0) { setCountdown(null); void handleSnap(); return }
    const t = setTimeout(() => setCountdown((c) => (c ?? 1) - 1), 1000)
    return () => clearTimeout(t)
  }, [countdown]) // handleSnap added below after definition

  // ── Snap → generate ───────────────────────────────────────────────────────
  const handleSnap = useCallback(async () => {
    const video = videoRef.current
    if (!video || !outfit) return

    const ORDER: ClothingCategory[] = ['shirt', 'jacket', 'pants']
    const tryOnItems = ORDER.flatMap((cat) => outfit.items.filter((i) => i.category === cat))
    if (tryOnItems.length === 0) {
      setError('No supported garments in outfit')
      return
    }

    const frame = captureFrame(video)
    setSnapshot(frame)
    setAppState('loading')
    setError(null)
    setLoadingStep({ current: 1, total: tryOnItems.length })

    try {
      // Fetch all garment images as base64 upfront
      const garmentSrcs = await Promise.all(
        tryOnItems.map((item) => {
          const url = item.try_on_asset || item.image_url
          return url ? garmentToFashnSrc(url) : Promise.resolve(null)
        }),
      )

      // Chain calls: each result becomes the model image for the next garment
      let modelImage: { image_base64: string } | { model_image_url: string } = { image_base64: frame }
      let resultUrl = ''

      for (let i = 0; i < tryOnItems.length; i++) {
        setLoadingStep({ current: i + 1, total: tryOnItems.length })
        const garmentSrc = garmentSrcs[i]
        if (!garmentSrc) continue

        const data = await api.fetchJson<{ result_image_url: string }>('/tryon/photo', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...modelImage, garment_src: garmentSrc }),
        })

        resultUrl  = data.result_image_url
        modelImage = { model_image_url: resultUrl }
      }

      setResultUrl(resultUrl)
      setLoadingStep(null)
      setAppState('result')
    } catch (e) {
      console.error('[TryOn] generate failed:', e)
      const msg = e instanceof Error ? e.message : typeof e === 'string' ? e : 'Generation failed'
      setError(msg)
      setLoadingStep(null)
      setAppState('camera')
    }
  }, [api, outfit])

  // ── Save / discard / retake ───────────────────────────────────────────────
  const handleSave = useCallback(async () => {
    if (!outfit || saving) return
    setSaving(true)
    try { await onSaveOutfit(outfit) } finally { setSaving(false) }
    onClose()
    navigate('/app/closet')
  }, [onSaveOutfit, outfit, saving, onClose, navigate])

  const handleDiscard = useCallback(() => {
    if (outfit) onSkipOutfit?.(outfit)
    onClose()
    navigate('/app/builder')
  }, [onSkipOutfit, outfit, onClose, navigate])

  const handleRetake = useCallback(() => {
    setResultUrl(null)
    setAppState('camera')
  }, [])

  // ── Gesture + hand tracking ───────────────────────────────────────────────
  const { ingest } = useHandGestures({
    onFist:  () => { if (appStateRef.current === 'camera') startCountdown() },
    onLeft:  () => { if (appStateRef.current === 'result') handleDiscard() },
    onRight: () => { if (appStateRef.current === 'result') void handleSave() },
    mirrorX: true,
  })

  const drawSkeleton = useCallback(
    (ctx: CanvasRenderingContext2D, lms: { x: number; y: number; z: number }[], W: number, H: number) => {
      const CONN: [number, number][] = [
        [0,1],[1,2],[2,3],[3,4],[0,5],[5,6],[6,7],[7,8],
        [5,9],[9,10],[10,11],[11,12],[9,13],[13,14],[14,15],[15,16],
        [13,17],[17,18],[18,19],[19,20],[0,17],
      ]
      const TIPS = new Set([0, 4, 8, 12, 16, 20])
      ctx.strokeStyle = '#8b5cf6'
      ctx.lineWidth = W < 200 ? 1.5 : 3
      for (const [a, b] of CONN) {
        ctx.beginPath()
        ctx.moveTo(lms[a].x * W, lms[a].y * H)
        ctx.lineTo(lms[b].x * W, lms[b].y * H)
        ctx.stroke()
      }
      for (let i = 0; i < lms.length; i++) {
        const r = W < 200 ? (i === 0 ? 3 : TIPS.has(i) ? 2 : 1.5) : (i === 0 ? 7 : TIPS.has(i) ? 5 : 3)
        ctx.beginPath()
        ctx.arc(lms[i].x * W, lms[i].y * H, r, 0, Math.PI * 2)
        ctx.fillStyle = i === 0 ? '#22c55e' : TIPS.has(i) ? '#f59e0b' : '#e5e7eb'
        ctx.fill()
      }
    },
    [],
  )

  const handleLandmarks = useCallback((lms: { x: number; y: number; z: number }[] | null) => {
    ingest(lms)

    // Full-screen skeleton during camera state
    const canvas = skeletonRef.current
    if (canvas) {
      if (canvas.width !== canvas.offsetWidth)   canvas.width  = canvas.offsetWidth
      if (canvas.height !== canvas.offsetHeight) canvas.height = canvas.offsetHeight
      const ctx = canvas.getContext('2d')!
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      if (lms && appStateRef.current === 'camera') {
        drawSkeleton(ctx, lms, canvas.width, canvas.height)
      }
    }

    // PiP skeleton during result state
    const pip = skeletonPipRef.current
    if (pip) {
      pip.width  = pip.offsetWidth  || 120
      pip.height = pip.offsetHeight || 160
      const ctx2 = pip.getContext('2d')!
      ctx2.clearRect(0, 0, pip.width, pip.height)
      if (lms && appStateRef.current === 'result') {
        drawSkeleton(ctx2, lms, pip.width, pip.height)
      }
    }
  }, [ingest, drawSkeleton])

  useHands(videoRef, handleLandmarks)

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black">
      {/* Webcam — always mounted; repositioned by CSS per state */}
      <video
        ref={videoRef}
        playsInline
        muted
        className={
          appState === 'camera'
            ? 'absolute inset-0 h-full w-full object-cover'
            : appState === 'result'
            ? 'absolute right-4 top-4 z-30 rounded-2xl border-2 border-white/20 object-cover shadow-xl'
            : 'hidden'
        }
        style={appState === 'result' ? { width: 144, height: 192 } : undefined}
      />

      {cameraError && (
        <div className="absolute inset-0 z-10 flex items-center justify-center">
          <div className="max-w-sm rounded-2xl bg-zinc-900 p-8 text-center">
            <p className="text-white">Camera unavailable</p>
            <p className="mt-2 text-sm text-zinc-400">{cameraError}</p>
          </div>
        </div>
      )}

      {/* Skeleton overlay — full-screen during camera state */}
      {appState === 'camera' && (
        <canvas
          ref={skeletonRef}
          className="absolute inset-0 z-10 h-full w-full"
          style={{ pointerEvents: 'none' }}
        />
      )}

      {/* PiP skeleton overlay — sits on top of the PiP webcam during result state */}
      {appState === 'result' && (
        <canvas
          ref={skeletonPipRef}
          className="absolute z-40 rounded-2xl"
          style={{ right: 16, top: 16, width: 144, height: 192, pointerEvents: 'none' }}
        />
      )}

      {appState === 'camera' && !cameraError && (
        <TryOnCamera
          garmentItem={outfit ? primaryGarment(outfit.items) : null}
          onSnap={startCountdown}
          countdown={countdown}
          disabled={!cameraReady}
        />
      )}

      {appState === 'loading' && snapshotDataUrl && (
        <TryOnLoader snapshotDataUrl={snapshotDataUrl} step={loadingStep ?? undefined} />
      )}

      {appState === 'result' && resultUrl && (
        <TryOnResult
          resultUrl={resultUrl}
          onSave={() => void handleSave()}
          onDiscard={handleDiscard}
          onRetake={handleRetake}
        />
      )}

      {generateError && appState === 'camera' && (
        <div className="absolute bottom-36 left-1/2 z-30 -translate-x-1/2 rounded-full bg-red-900/80 px-4 py-2 text-xs text-red-200">
          {generateError}
        </div>
      )}

      {saving && (
        <div className="absolute left-1/2 top-1/2 z-30 -translate-x-1/2 -translate-y-1/2 rounded-full bg-violet-600/90 px-6 py-3 text-sm font-medium text-white shadow-lg backdrop-blur">
          Saving…
        </div>
      )}

      <button
        type="button"
        onClick={onClose}
        className="absolute right-4 top-4 z-40 rounded-full bg-black/50 p-2 text-zinc-200 backdrop-blur hover:bg-black/70"
        style={appState === 'result' ? { top: 208 } : undefined}
        aria-label="Close"
      >
        ✕
      </button>

      {appState === 'camera' && outfitQueue.length > 1 && (
        <div className="absolute left-1/2 top-4 z-20 -translate-x-1/2 rounded-full bg-black/40 px-3 py-1 text-xs text-zinc-300 backdrop-blur">
          {idx + 1} / {outfitQueue.length}
        </div>
      )}
    </div>
  )
}
