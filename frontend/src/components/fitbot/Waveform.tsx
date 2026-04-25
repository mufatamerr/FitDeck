type Props = {
  active: boolean
  className?: string
}

/** Lightweight “playing audio” indicator (handoff §6.3 waveform). */
export function Waveform({ active, className = '' }: Props) {
  if (!active) return null
  return (
    <div
      className={`flex h-8 items-end justify-center gap-0.5 ${className}`}
      aria-hidden
    >
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <span
          key={i}
          className="h-6 w-1 rounded-full bg-violet-400/90 animate-fitbot-bar"
          style={{ animationDelay: `${i * 0.09}s` }}
        />
      ))}
    </div>
  )
}
