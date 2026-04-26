import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { BrandMark } from './BrandMark'
import { RunwayStage } from './RunwayStage'

type AuthShellProps = {
  eyebrow: string
  title: string
  description: string
  alternateLabel: string
  alternateHref: string
  alternatePrompt: string
  children: ReactNode
}

export function AuthShell({
  eyebrow,
  title,
  description,
  alternateLabel,
  alternateHref,
  alternatePrompt,
  children,
}: AuthShellProps) {
  return (
    <main className="auth-shell">
      <div className="page-shell auth-shell__frame">
        <section className="auth-shell__story">
          <BrandMark />
          <p className="auth-shell__eyebrow">{eyebrow}</p>
          <h1 className="auth-shell__title">{title}</h1>
          <p className="auth-shell__description">{description}</p>
          <RunwayStage />
        </section>

        <section className="auth-shell__panel">
          {children}
          <p className="mt-6 text-sm text-zinc-500">
            {alternatePrompt}{' '}
            <Link to={alternateHref} className="text-white transition hover:opacity-70">
              {alternateLabel}
            </Link>
          </p>
        </section>
      </div>
    </main>
  )
}
