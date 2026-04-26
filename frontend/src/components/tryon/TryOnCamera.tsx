import { useEffect, useRef, useState } from 'react'

import type { ClothingItem } from '../../types'

type Props = {
  garmentItem: ClothingItem | null
  onSnap: () => void
  disabled?: boolean
}

export function TryOnCamera({ garmentItem, onSnap, disabled }: Props) {
  const thumb = garmentItem?.image_url || garmentItem?.try_on_asset
  const [countdown, setCountdown] = useState<number | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const startCountdown = () => {
    if (disabled || countdown !== null) return
    setCountdown(3)
  }

  useEffect(() => {
    if (countdown === null) return

    if (countdown === 0) {
      timerRef.current = null
      setCountdown(null)
      onSnap()
      return
    }

    timerRef.current = setTimeout(() => setCountdown((c) => (c ?? 1) - 1), 1000)
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [countdown, onSnap])

  const isCounting = countdown !== null

  return (
    <div className="absolute inset-0 z-10 flex flex-col justify-between">
      {/* Garment reference thumbnail — top-left */}
      {thumb && (
        <div className="m-4 self-start">
          <div className="rounded-xl border border-white/20 bg-black/40 p-1 backdrop-blur">
            <img
              src={thumb}
              alt={garmentItem?.name}
              className="h-20 w-16 rounded-lg object-cover"
            />
            <p className="mt-1 truncate px-1 text-center text-xs text-zinc-300">
              {garmentItem?.name}
            </p>
          </div>
        </div>
      )}

      {/* Countdown overlay */}
      {isCounting && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span
            key={countdown}
            className="animate-ping-once text-9xl font-bold text-white drop-shadow-[0_0_24px_rgba(0,0,0,0.9)]"
          >
            {countdown}
          </span>
        </div>
      )}

      {/* Snap button — bottom center */}
      <div className="mb-10 flex flex-col items-center gap-3">
        <p className="text-xs text-zinc-400">
          {isCounting ? 'Get ready…' : 'Step back and face the camera'}
        </p>

        {/*
         * GESTURE HOOK: Replace or supplement this button with fist gesture detection.
         * When a fist is held for 1000ms, call startCountdown() (or onSnap() directly to skip timer).
         * Partner is implementing gesture detection separately.
         * startCountdown() → 3-2-1 → onSnap() is the trigger chain.
         */}
        <button
          type="button"
          onClick={startCountdown}
          disabled={disabled || isCounting}
          className="flex h-20 w-20 items-center justify-center rounded-full border-4 border-white bg-white/10 text-white shadow-lg backdrop-blur transition active:scale-95 disabled:opacity-40"
          aria-label="Snap photo"
        >
          {isCounting ? (
            <span className="text-2xl font-bold">{countdown}</span>
          ) : (
            <div className="h-14 w-14 rounded-full bg-white" />
          )}
        </button>

        <p className="text-xs text-zinc-500">
          {isCounting ? `Snapping in ${countdown}…` : 'Tap to snap'}
        </p>
      </div>
    </div>
  )
}
