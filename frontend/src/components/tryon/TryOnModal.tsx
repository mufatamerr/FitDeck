import { useAuth0 } from '@auth0/auth0-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { useUiStore } from '../../store/uiStore'
import { ApiClient } from '../../services/api'
import type { ClothingCategory, ClothingItem, Outfit } from '../../types'
import { TryOnCamera } from './TryOnCamera'
import { TryOnLoader } from './TryOnLoader'
import { TryOnResult } from './TryOnResult'
import { useHandGestures } from './useHandGestures'

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
  return c.toDataURL('image/jpeg', 0.85)
}

// Fetch a garment URL in the browser and convert to base64 data URI.
// Fashn.ai is a cloud service and cannot reach 127.0.0.1, so we always send base64.
async function garmentToDataUri(url: string): Promise<string> {
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

  // ── Webcam ────────────────────────────────────────────────────────────────
  const videoRef    = useRef<HTMLVideoElement>(null)
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
  const [appState, setAppState]       = useState<AppState>('camera')
  const [idx, setIdx]                 = useState(startIndex)
  const [snapshotDataUrl, setSnapshot] = useState('')
  const [resultUrl, setResultUrl]     = useState<string | null>(null)
  const [generateError, setError]     = useState<string | null>(null)
  const [saving, setSaving]           = useState(false)

  const appStateRef = useRef(appState)
  appStateRef.current = appState

  const outfit = outfitQueue[idx]

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

    try {
      // Fetch all garment images as base64 in the browser (Fashn.ai can't reach localhost)
      const garmentDataUris = await Promise.all(
        tryOnItems.map((item) => {
          const url = item.try_on_asset || item.image_url
          return url ? garmentToDataUri(url) : Promise.resolve(null)
        }),
      )

      // Backend chains generations server-side: shirt → jacket → pants
      const data = await api.fetchJson<{ result_image_url: string }>('/tryon/photo', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image_base64: frame,
          items: tryOnItems.map((item, i) => ({
            id:           item.id,
            category:     item.category,
            try_on_asset: garmentDataUris[i] ?? null,
            image_url:    null,
          })),
        }),
      })

      setResultUrl(data.result_image_url)
      setAppState('result')
    } catch (e) {
      console.error('[TryOn] generate failed:', e)
      const msg = e instanceof Error ? e.message : typeof e === 'string' ? e : 'Generation failed'
      setError(msg)
      setAppState('camera')
    }
  }, [api, outfit])

  // ── Save / discard / retake ───────────────────────────────────────────────
  const handleSave = useCallback(async () => {
    if (!outfit || saving) return
    setSaving(true)
    try { await onSaveOutfit(outfit) } finally { setSaving(false) }
    setResultUrl(null)
    setAppState('camera')
  }, [onSaveOutfit, outfit, saving])

  const handleDiscard = useCallback(() => {
    if (outfit) onSkipOutfit?.(outfit)
    setResultUrl(null)
    setAppState('camera')
    setIdx((i) => Math.min(i + 1, outfitQueue.length - 1))
  }, [onSkipOutfit, outfit, outfitQueue.length])

  const handleRetake = useCallback(() => {
    setResultUrl(null)
    setAppState('camera')
  }, [])

  // ── Gesture hook ──────────────────────────────────────────────────────────
  // GESTURE HOOK: ingest(handLandmarks) should be called each frame with live
  // hand landmark data. Install @mediapipe/hands and add a useHands(videoRef)
  // hook here, then call ingest(landmarks) in a useEffect each frame.
  const { ingest } = useHandGestures({
    onFist:  () => { if (appStateRef.current === 'camera') void handleSnap() },
    onLeft:  () => { if (appStateRef.current === 'result') handleDiscard() },
    onRight: () => { if (appStateRef.current === 'result') void handleSave() },
    mirrorX: true,
  })

  // Expose ingest so hand-tracking integration can feed landmarks in:
  // e.g.  const { landmarks } = useHands(videoRef)
  //       useEffect(() => ingest(landmarks), [landmarks])
  void ingest  // suppress unused warning until hand tracking is wired

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
        style={appState === 'result' ? { width: 120, height: 160 } : undefined}
      />

      {cameraError && (
        <div className="absolute inset-0 z-10 flex items-center justify-center">
          <div className="max-w-sm rounded-2xl bg-zinc-900 p-8 text-center">
            <p className="text-white">Camera unavailable</p>
            <p className="mt-2 text-sm text-zinc-400">{cameraError}</p>
          </div>
        </div>
      )}

      {appState === 'camera' && !cameraError && (
        <TryOnCamera
          garmentItem={outfit ? primaryGarment(outfit.items) : null}
          onSnap={() => void handleSnap()}
          disabled={!cameraReady}
        />
      )}

      {appState === 'loading' && snapshotDataUrl && (
        <TryOnLoader snapshotDataUrl={snapshotDataUrl} />
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
        <div className="absolute left-1/2 top-4 z-30 -translate-x-1/2 rounded-full bg-violet-600/90 px-4 py-2 text-xs text-white">
          Saving…
        </div>
      )}

      <button
        type="button"
        onClick={onClose}
        className="absolute right-4 top-4 z-40 rounded-full bg-black/50 p-2 text-zinc-200 backdrop-blur hover:bg-black/70"
        style={appState === 'result' ? { top: 176 } : undefined}
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
