type Props = {
  resultUrl: string
  onSave:    () => void
  onDiscard: () => void
  onRetake:  () => void
}

export function TryOnResult({ resultUrl, onSave, onDiscard, onRetake }: Props) {
  return (
    <div className="absolute inset-0 z-20 flex flex-col bg-black">
      {/* Generated image — fills screen */}
      <img
        src={resultUrl}
        alt="AI try-on result"
        className="flex-1 w-full object-contain"
        draggable={false}
      />

      {/* Retake — top-left (note: PiP webcam is top-right, rendered by parent) */}
      <button
        type="button"
        onClick={onRetake}
        className="absolute left-4 top-4 rounded-full bg-black/50 px-3 py-2 text-xs text-zinc-300 backdrop-blur"
      >
        ← Retake
      </button>

      {/* Gesture hint */}
      <p className="pb-1 text-center text-xs text-zinc-500 tracking-widest">
        ← swipe to discard &nbsp;·&nbsp; swipe to save →
      </p>

      {/* Save / Discard */}
      <div className="flex items-center gap-3 p-5 pb-8">
        <button
          type="button"
          onClick={onSave}
          className="flex-1 rounded-2xl bg-violet-600 py-4 text-sm font-semibold text-white active:bg-violet-700"
        >
          Save to Closet
        </button>
        <button
          type="button"
          onClick={onDiscard}
          className="flex-1 rounded-2xl border border-zinc-700 py-4 text-sm font-medium text-zinc-300 active:bg-zinc-800"
        >
          Discard
        </button>
      </div>
    </div>
  )
}
