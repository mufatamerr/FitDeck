type Props = {
  snapshotDataUrl: string
  step?: string
}

export function TryOnLoader({ snapshotDataUrl, step }: Props) {
  return (
    <div className="absolute inset-0 z-20">
      {/* Frozen snapshot as background */}
      <img
        src={snapshotDataUrl}
        alt="snapshot"
        className="h-full w-full object-cover"
        draggable={false}
      />

      {/* Pulsing overlay */}
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 backdrop-blur-sm">
        <div className="mb-6 h-12 w-12 animate-spin rounded-full border-4 border-zinc-600 border-t-violet-400" />
        <p className="text-base font-medium text-white">
          {step || 'Generating your look…'}
        </p>
        <p className="mt-2 text-sm text-zinc-400">This usually takes 15–30 seconds per item</p>
      </div>
    </div>
  )
}
