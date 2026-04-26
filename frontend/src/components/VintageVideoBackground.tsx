type VintageVideoBackgroundProps = {
  className?: string
  opacity?: number
  src?: string
}

const DEFAULT_SRC = 'https://www.pexels.com/download/video/7568635/'

export function VintageVideoBackground({
  className,
  opacity = 0.72,
  src = DEFAULT_SRC,
}: VintageVideoBackgroundProps) {
  return (
    <div
      className={className}
      style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}
      aria-hidden="true"
    >
      <video
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
        src={src}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          filter: `grayscale(1) sepia(0.08) contrast(1.02) brightness(0.84) saturate(0.12) opacity(${opacity})`,
        }}
      />

      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(255,255,255,0.06)',
        }}
      />

      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(ellipse 70% 72% at 50% 44%, transparent 28%, rgba(0,0,0,0.32) 100%)',
        }}
      />

      <div
        style={{
          position: 'absolute',
          inset: '-50%',
          opacity: 0.06,
          backgroundImage:
            'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.85\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\'/%3E%3C/svg%3E")',
          backgroundSize: '200px 200px',
          animation: 'grain 0.4s steps(2) infinite',
        }}
      />
    </div>
  )
}
