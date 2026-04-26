import type { ClothingItem } from '../../types'

type Props = {
  garmentItem: ClothingItem | null
  onSnap: () => void
  countdown: number | null
  disabled?: boolean
}

export function TryOnCamera({ garmentItem, onSnap, countdown, disabled }: Props) {
  const thumb = garmentItem?.image_url || garmentItem?.try_on_asset
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
          {isCounting ? 'Get ready…' : 'Make a fist or tap to snap'}
        </p>

        <button
          type="button"
          onClick={onSnap}
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
          {isCounting ? `Snapping in ${countdown}…` : 'Tap or ✊ fist'}
        </p>
      </div>
    </div>
  )
}
