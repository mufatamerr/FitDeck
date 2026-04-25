type Props = {
  outfitName?: string | null
  index: number
  total: number
  onSkip: () => void
  onSave: () => void
  onClose: () => void
}

export function TryOnControls({ outfitName, index, total, onSkip, onSave, onClose }: Props) {
  return (
    <div className="absolute inset-0 z-20 flex flex-col justify-between p-4">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onClose}
          className="rounded-full bg-black/40 px-3 py-2 text-sm text-zinc-200 backdrop-blur hover:bg-black/55"
        >
          ✕
        </button>
        <div className="rounded-full bg-black/40 px-3 py-2 text-xs text-zinc-300 backdrop-blur">
          {Math.min(index + 1, total)} / {total}
        </div>
      </div>

      <div className="mx-auto w-full max-w-lg">
        <div className="rounded-xl border border-white/10 bg-black/35 px-4 py-3 text-center text-sm text-zinc-200 backdrop-blur">
          {outfitName || 'Try-On'}
          <div className="mt-1 text-xs text-zinc-400">
            Swipe left to skip · Swipe right to save
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onSkip}
            className="flex-1 rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white hover:bg-white/10"
          >
            ← Skip
          </button>
          <button
            type="button"
            onClick={onSave}
            className="flex-1 rounded-xl bg-violet-600 px-4 py-3 text-sm font-semibold text-white hover:bg-violet-500"
          >
            Save →
          </button>
        </div>
      </div>
    </div>
  )
}

