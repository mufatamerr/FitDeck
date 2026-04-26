import { useEffect, useRef, useState } from 'react'

type Props = {
  onReady: (video: HTMLVideoElement) => void
  onError: (message: string) => void
}

export function CameraLayer({ onReady, onError }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const [starting, setStarting] = useState(true)

  useEffect(() => {
    let stream: MediaStream | null = null
    let cancelled = false
    const start = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'user',
            width: { ideal: 1280 },
            height: { ideal: 720 },
            frameRate: { ideal: 30, max: 60 },
          },
          audio: false,
        })
        if (cancelled) return
        const v = videoRef.current
        if (!v) return
        v.srcObject = stream
        try {
          await v.play()
        } catch (e) {
          // React StrictMode (dev) can mount/unmount twice; ignore the "interrupted" play error
          const msg = e instanceof Error ? e.message : String(e)
          if (!cancelled && !msg.toLowerCase().includes('interrupted')) {
            throw e
          }
        }
        if (cancelled) return
        onReady(v)
      } catch (e) {
        if (!cancelled) {
          onError(e instanceof Error ? e.message : 'Camera permission denied')
        }
      } finally {
        if (!cancelled) setStarting(false)
      }
    }
    void start()

    return () => {
      cancelled = true
      if (stream) stream.getTracks().forEach((t) => t.stop())
    }
  }, [onError, onReady])

  return (
    <div className="absolute inset-0">
      <video
        ref={videoRef}
        playsInline
        muted
        className="h-full w-full object-cover"
      />
      {starting && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-sm text-zinc-300">
          Starting camera…
        </div>
      )}
    </div>
  )
}

