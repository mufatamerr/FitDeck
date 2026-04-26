import { Link } from 'react-router-dom'

type BrandMarkProps = {
  subtle?: boolean
}

export function BrandMark({ subtle = false }: BrandMarkProps) {
  return (
    <Link to="/" className="inline-flex items-center gap-3 text-white transition hover:opacity-80">
      <span className={`brand-mark__icon${subtle ? ' is-subtle' : ''}`}>
        <span className="brand-mark__icon-core" />
      </span>
      <span>
        <span className="block text-xl font-semibold leading-none tracking-[0.28em]">
          FITDECK
        </span>
        <span className="block text-[0.65rem] uppercase tracking-[0.34em] text-zinc-500">
          Try on first
        </span>
      </span>
    </Link>
  )
}
