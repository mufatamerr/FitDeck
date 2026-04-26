import { useFitAuth } from '../auth/FitAuth'

/** OAuth redirect lands here briefly; Auth0Provider onRedirectCallback sends user to /app */
export function CallbackPage() {
  const { error, isConfigured, isLoading } = useFitAuth()

  if (!isConfigured) {
    return (
      <div className="page-loader px-6 text-center">
        <div className="glass-panel max-w-md px-6 py-10">
          <p className="font-medium text-amber-200">Auth0 not configured</p>
          <p className="mt-2 text-sm text-zinc-400">
            Add real values to `frontend/.env.local` when you are ready to test hosted
            authentication.
          </p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="page-loader px-6 text-center">
        <div className="glass-panel max-w-md px-6 py-10">
          <p className="font-medium text-red-300">Auth error</p>
          <p className="mt-2 text-sm text-zinc-400">{error.message}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="page-loader">
      <div className="page-loader__ring" />
      <p>{isLoading ? 'Signing you in…' : 'Redirecting…'}</p>
    </div>
  )
}
