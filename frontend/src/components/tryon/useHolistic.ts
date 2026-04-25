import { useEffect, useMemo, useRef, useState } from 'react'

import { Holistic, type Results } from '@mediapipe/holistic'

type UseHolisticArgs = {
  video: HTMLVideoElement | null
  onResults: (results: Results) => void
}

export function useHolistic({ video, onResults }: UseHolisticArgs) {
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const holisticRef = useRef<Holistic | null>(null)
  const rafRef = useRef<number | null>(null)

  const holistic = useMemo(() => {
    const h = new Holistic({
      locateFile: (file) =>
        `https://cdn.jsdelivr.net/npm/@mediapipe/holistic/${file}`,
    })
    h.setOptions({
      modelComplexity: 1,
      smoothLandmarks: true,
      minDetectionConfidence: 0.7,
      minTrackingConfidence: 0.5,
      enableSegmentation: false,
    })
    return h
  }, [])

  useEffect(() => {
    holisticRef.current = holistic
    holistic.onResults(onResults)
    return () => {
      holisticRef.current = null
    }
  }, [holistic, onResults])

  useEffect(() => {
    if (!video) return
    let cancelled = false

    const loop = async () => {
      if (cancelled) return
      try {
        if (video.readyState >= 2) {
          await holistic.send({ image: video })
          if (!ready) setReady(true)
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Holistic failed')
      } finally {
        rafRef.current = requestAnimationFrame(loop)
      }
    }

    rafRef.current = requestAnimationFrame(loop)

    return () => {
      cancelled = true
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
  }, [holistic, ready, video])

  useEffect(() => {
    return () => {
      try {
        holisticRef.current?.close()
      } catch {
        // ignore
      }
    }
  }, [])

  return { ready, error }
}

