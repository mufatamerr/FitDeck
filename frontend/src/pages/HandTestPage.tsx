import { useEffect, useMemo, useRef, useState } from 'react'
import { Hands } from '@mediapipe/hands'
import { useHandGestures } from '../components/tryon/useHandGestures'

type Landmark = { x: number; y: number; z: number }

const CONNECTIONS: [number, number][] = [
  [0,1],[1,2],[2,3],[3,4],
  [0,5],[5,6],[6,7],[7,8],
  [5,9],[9,10],[10,11],[11,12],
  [9,13],[13,14],[14,15],[15,16],
  [13,17],[17,18],[18,19],[19,20],
  [0,17],
]
const TIPS = new Set([0, 4, 8, 12, 16, 20])

export function HandTestPage() {
  const videoRef  = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const videoElRef = useRef<HTMLVideoElement | null>(null)

  // ── All hot-path data lives in refs — no setState in RAF/gesture callbacks ─
  const gestureRef = useRef('—')
  const statusRef  = useRef('Starting camera…')
  const runningRef = useRef(false)

  // ── React state only for display, polled at 10 fps ────────────────────────
  const [displayStatus,  setDisplayStatus]  = useState('Starting camera…')
  const [displayGesture, setDisplayGesture] = useState('—')

  useEffect(() => {
    const id = setInterval(() => {
      setDisplayStatus(statusRef.current)
      setDisplayGesture(gestureRef.current)
    }, 100)
    return () => clearInterval(id)
  }, [])

  // ── Gesture callbacks write to ref only (no setState) ─────────────────────
  const { ingest } = useHandGestures({
    onFist:  () => { gestureRef.current = '✊ FIST' },
    onLeft:  () => { gestureRef.current = '👈 SWIPE LEFT' },
    onRight: () => { gestureRef.current = '👉 SWIPE RIGHT' },
    mirrorX: true,
  })
  const ingestRef = useRef(ingest)
  ingestRef.current = ingest

  // ── Stable results handler (ref — never recreated, never a dep) ───────────
  const onResultsRef = useRef((results: { multiHandLandmarks?: Landmark[][] }) => {
    if (!runningRef.current) { runningRef.current = true; statusRef.current = 'Running' }

    const lms = results.multiHandLandmarks?.[0] ?? null
    ingestRef.current(lms)

    const canvas = canvasRef.current
    const video  = videoRef.current
    if (!canvas || !video) return

    if (canvas.width  !== video.videoWidth)  canvas.width  = video.videoWidth
    if (canvas.height !== video.videoHeight) canvas.height = video.videoHeight

    const ctx = canvas.getContext('2d')!
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    if (!lms) return

    const W = canvas.width
    const H = canvas.height
    ctx.strokeStyle = '#8b5cf6'
    ctx.lineWidth = 3
    for (const [a, b] of CONNECTIONS) {
      ctx.beginPath()
      ctx.moveTo((1 - lms[a].x) * W, lms[a].y * H)
      ctx.lineTo((1 - lms[b].x) * W, lms[b].y * H)
      ctx.stroke()
    }
    for (let i = 0; i < lms.length; i++) {
      ctx.beginPath()
      ctx.arc((1 - lms[i].x) * W, lms[i].y * H, i === 0 ? 7 : TIPS.has(i) ? 5 : 3, 0, Math.PI * 2)
      ctx.fillStyle = i === 0 ? '#22c55e' : TIPS.has(i) ? '#f59e0b' : '#e5e7eb'
      ctx.fill()
    }
  })

  // ── Stable Hands model ────────────────────────────────────────────────────
  const hands = useMemo(() => {
    const h = new Hands({
      locateFile: (f) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${f}`,
    })
    h.setOptions({ maxNumHands: 1, modelComplexity: 0, minDetectionConfidence: 0.7, minTrackingConfidence: 0.5 })
    h.onResults((r) => onResultsRef.current(r as { multiHandLandmarks?: Landmark[][] }))
    return h
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => () => { try { hands.close() } catch { /* ignore */ } }, [hands])

  // ── Camera + send loop ────────────────────────────────────────────────────
  useEffect(() => {
    let stream: MediaStream | null = null
    let rafId: number
    let cancelled = false

    const loop = async () => {
      if (cancelled) return
      const video = videoElRef.current
      try {
        if (video && video.readyState >= 2) await hands.send({ image: video })
      } catch { /* model still loading */ }
      finally { if (!cancelled) rafId = requestAnimationFrame(loop) }
    }

    navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
      audio: false,
    }).then(async (s) => {
      if (cancelled) { s.getTracks().forEach(t => t.stop()); return }
      stream = s
      const v = videoRef.current!
      v.srcObject = s
      await v.play()
      videoElRef.current = v
      statusRef.current = 'Model loading…'
      rafId = requestAnimationFrame(loop)
    }).catch((e) => {
      statusRef.current = `Camera error: ${e instanceof Error ? e.message : e}`
    })

    return () => {
      cancelled = true
      cancelAnimationFrame(rafId)
      stream?.getTracks().forEach(t => t.stop())
    }
  }, [hands])

  return (
    <div className="fixed inset-0 bg-black">
      <video
        ref={videoRef}
        playsInline
        muted
        className="absolute inset-0 h-full w-full object-cover"
        style={{ transform: 'scaleX(-1)' }}
      />
      <canvas
        ref={canvasRef}
        className="absolute inset-0 h-full w-full"
        style={{ pointerEvents: 'none' }}
      />

      {displayGesture !== '—' && (
        <div className="absolute left-1/2 top-12 z-20 -translate-x-1/2 rounded-full bg-black/60 px-6 py-2 text-lg font-bold text-violet-300 backdrop-blur">
          {displayGesture}
        </div>
      )}

      <div className="absolute bottom-8 left-1/2 z-20 flex -translate-x-1/2 gap-4 text-sm">
        <div className="rounded-xl bg-black/60 px-4 py-3 text-center backdrop-blur">
          <p className="text-zinc-400">Status</p>
          <p className="mt-1 font-mono text-green-400">{displayStatus}</p>
        </div>
        <div className="rounded-xl bg-black/60 px-4 py-3 text-center backdrop-blur">
          <p className="text-zinc-400">Last gesture</p>
          <p className="mt-1 font-mono text-violet-400">{displayGesture}</p>
        </div>
      </div>

      <p className="absolute bottom-2 left-1/2 z-20 -translate-x-1/2 text-xs text-zinc-600">
        ✊ fist &nbsp;|&nbsp; swipe left / right
      </p>
    </div>
  )
}
