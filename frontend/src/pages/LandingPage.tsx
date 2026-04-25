import { useAuth0 } from '@auth0/auth0-react'
import { Navigate } from 'react-router-dom'

export function LandingPage() {
  const { isAuthenticated, isLoading, loginWithRedirect } = useAuth0()

  if (isLoading) {
    return (
      <div className="flex min-h-dvh items-center justify-center text-zinc-400">
        Loading…
      </div>
    )
  }
  if (isAuthenticated) {
    return <Navigate to="/app" replace />
  }

  return (
    <div className="relative min-h-dvh overflow-hidden px-6 py-20">
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          background:
            'radial-gradient(ellipse 80% 50% at 50% -20%, rgba(124, 58, 237, 0.35), transparent)',
        }}
      />
      <div className="relative mx-auto max-w-2xl text-center">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-violet-300/90">
          BearHacks 2026
        </p>
        <h1 className="mt-4 font-display text-5xl font-medium tracking-tight text-white sm:text-6xl">
          FitDeck
        </h1>
        <p className="mt-4 text-lg text-zinc-400">
          Browse. Build. Try On. — Auth prototype: sign in to verify your Auth0 + API
          token flow.
        </p>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <button
            type="button"
            onClick={() =>
              loginWithRedirect({
                appState: { returnTo: '/app' },
              })
            }
            className="rounded-full bg-violet-600 px-8 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-900/40 transition hover:bg-violet-500"
          >
            Log in / Sign up
          </button>
        </div>
      </div>
    </div>
  )
}
