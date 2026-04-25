import { useAuth0 } from '@auth0/auth0-react'

/** OAuth redirect lands here briefly; Auth0Provider onRedirectCallback sends user to /app */
export function CallbackPage() {
  const { error, isLoading } = useAuth0()

  if (error) {
    return (
      <div className="mx-auto max-w-md px-6 py-20 text-center text-red-300">
        <p className="font-medium">Auth error</p>
        <p className="mt-2 text-sm text-zinc-400">{error.message}</p>
      </div>
    )
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-3 text-zinc-400">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-violet-500 border-t-transparent" />
      <p>{isLoading ? 'Signing you in…' : 'Redirecting…'}</p>
    </div>
  )
}
