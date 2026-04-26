import { useEffect, useMemo, useRef } from 'react'
import { Hands } from '@mediapipe/hands'

type Landmark = { x: number; y: number; z: number }

export function useHands(
  videoRef: React.RefObject<HTMLVideoElement | null>,
  onLandmarks: (lms: Landmark[] | null) => void,
) {
  // Keep callback stable — never a dep so the loop never restarts
  const onLandmarksRef = useRef(onLandmarks)
  onLandmarksRef.current = onLandmarks

  const hands = useMemo(() => {
    const h = new Hands({
      locateFile: (f) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${f}`,
    })
    h.setOptions({
      maxNumHands: 1,
      modelComplexity: 0,
      minDetectionConfidence: 0.7,
      minTrackingConfidence: 0.5,
    })
    h.onResults((r) => {
      const results = r as { multiHandLandmarks?: Landmark[][] }
      onLandmarksRef.current(results.multiHandLandmarks?.[0] ?? null)
    })
    return h
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    let rafId: number
    let cancelled = false

    const loop = async () => {
      if (cancelled) return
      const video = videoRef.current
      try {
        if (video && video.readyState >= 2) await hands.send({ image: video })
      } catch { /* model still loading */ }
      finally { if (!cancelled) rafId = requestAnimationFrame(loop) }
    }

    rafId = requestAnimationFrame(loop)
    return () => {
      cancelled = true
      cancelAnimationFrame(rafId)
    }
  }, [hands, videoRef])

  useEffect(() => () => { try { hands.close() } catch { /* ignore */ } }, [hands])
}
