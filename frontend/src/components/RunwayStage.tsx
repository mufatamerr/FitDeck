export function RunwayStage() {
  return (
    <div className="runway-scene" aria-hidden="true">
      <div className="beam beam-1" />
      <div className="beam beam-2" />
      <div className="beam beam-3" />

      <div className="carpet" />

      <div className="fig-track">
        <div className="fig-bob">
          <svg
            className="fig-svg"
            viewBox="0 0 100 260"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <ellipse cx="64" cy="252" rx="28" ry="6" fill="rgba(0,0,0,0.45)" />

            <g className="fig-leg-b">
              <rect x="52" y="150" width="15" height="76" rx="6" fill="#18162a" />
              <ellipse cx="57" cy="229" rx="15" ry="5" fill="#0d0c1a" />
            </g>

            <rect x="36" y="56" width="42" height="96" rx="10" fill="#ede7db" />
            <line x1="58" y1="57" x2="56" y2="148" stroke="#c4bca8" strokeWidth="1.5" />
            <circle cx="55" cy="90" r="1.8" fill="#c0b8a8" />
            <circle cx="55" cy="107" r="1.8" fill="#c0b8a8" />
            <circle cx="55" cy="124" r="1.8" fill="#c0b8a8" />

            <g className="fig-arm-b">
              <rect x="21" y="60" width="13" height="54" rx="6" fill="#ddd7cb" />
              <ellipse cx="27" cy="117" rx="7" ry="8" fill="#bf9070" />
            </g>

            <rect x="57" y="44" width="10" height="14" rx="4" fill="#bf9070" />

            <ellipse cx="63" cy="26" rx="21" ry="23" fill="#bf9070" />
            <path d="M42 20 Q63 2 84 20 Q81 8 63 6 Q45 8 42 20Z" fill="#0d0500" />
            <circle cx="72" cy="24" r="3" fill="#0d0500" />
            <circle cx="73" cy="23" r="1.2" fill="rgba(255,255,255,0.75)" />
            <path d="M79 28 Q85 36 80 40" stroke="#9e6844" strokeWidth="1.8" fill="none" strokeLinecap="round" />
            <path d="M74 44 Q80 48 84 44" stroke="#9a6040" strokeWidth="1.6" fill="none" strokeLinecap="round" />

            <g className="fig-arm-f">
              <rect x="79" y="60" width="13" height="54" rx="6" fill="#ede7db" />
              <ellipse cx="85" cy="117" rx="7" ry="8" fill="#bf9070" />
            </g>

            <g className="fig-leg-f">
              <rect x="60" y="150" width="15" height="76" rx="6" fill="#201e32" />
              <ellipse cx="65" cy="229" rx="15" ry="5" fill="#110f1e" />
            </g>
          </svg>
        </div>
      </div>
    </div>
  )
}
