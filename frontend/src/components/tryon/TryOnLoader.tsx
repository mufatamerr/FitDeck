type Props = {
  snapshotDataUrl: string
  step?: { current: number; total: number }
}

export function TryOnLoader({ snapshotDataUrl, step }: Props) {
  const label = step
    ? step.total > 1
      ? `Generating ${step.current} / ${step.total}…`
      : 'Generating your look…'
    : 'Generating your look…'

  return (
    <div className="absolute inset-0 z-20">
      <img
        src={snapshotDataUrl}
        alt="snapshot"
        className="h-full w-full object-cover"
        draggable={false}
      />

      <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 backdrop-blur-sm">
        <div className="mb-6 h-12 w-12 animate-spin rounded-full border-4 border-zinc-600 border-t-violet-400" />
        <p className="text-base font-medium text-white">{label}</p>
        {step && step.total > 1 && (
          <div className="mt-4 flex gap-2">
            {Array.from({ length: step.total }, (_, i) => (
              <div
                key={i}
                className={`h-1.5 w-8 rounded-full transition-colors duration-300 ${
                  i < step.current ? 'bg-violet-400' : 'bg-zinc-600'
                }`}
              />
            ))}
          </div>
        )}
        <p className="mt-3 text-sm text-zinc-400">~15–30 s per garment</p>
      </div>
    </div>
  )
}
