import {
  Auth0Provider,
  useAuth0,
  type AppState,
  type RedirectLoginOptions,
} from '@auth0/auth0-react'
import {
  createContext,
  type ReactNode,
  useContext,
  useMemo,
} from 'react'
import { useNavigate } from 'react-router-dom'

type FitAuthValue = {
  error?: Error
  getAccessTokenSilently: (options?: {
    authorizationParams?: {
      audience?: string
    }
  }) => Promise<string>
  isAuthenticated: boolean
  isConfigured: boolean
  isLoading: boolean
  loginWithRedirect: (options?: RedirectLoginOptions) => Promise<void>
  logout: (options?: { logoutParams?: { returnTo?: string } }) => void
  user?: {
    email?: string
    name?: string
  }
}

const FitAuthContext = createContext<FitAuthValue | null>(null)

const domain = import.meta.env.VITE_AUTH0_DOMAIN
const clientId = import.meta.env.VITE_AUTH0_CLIENT_ID
const audience = import.meta.env.VITE_AUTH0_AUDIENCE

const isConfigured = Boolean(
  domain && clientId && !domain.includes('your-tenant') && clientId.trim().length > 0,
)

function Auth0Bridge({ children }: { children: ReactNode }) {
  const auth = useAuth0()

  const value = useMemo<FitAuthValue>(
    () => ({
      error: auth.error,
      getAccessTokenSilently: async (options) => auth.getAccessTokenSilently(options),
      isAuthenticated: auth.isAuthenticated,
      isConfigured: true,
      isLoading: auth.isLoading,
      loginWithRedirect: auth.loginWithRedirect,
      logout: auth.logout,
      user: auth.user
        ? {
            email: auth.user.email,
            name: auth.user.name,
          }
        : undefined,
    }),
    [auth],
  )

  return <FitAuthContext.Provider value={value}>{children}</FitAuthContext.Provider>
}

function GuestAuthProvider({ children }: { children: ReactNode }) {
  const value = useMemo<FitAuthValue>(
    () => ({
      getAccessTokenSilently: async () => '',
      isAuthenticated: false,
      isConfigured: false,
      isLoading: false,
      loginWithRedirect: async () => undefined,
      logout: () => undefined,
      user: undefined,
    }),
    [],
  )

  return <FitAuthContext.Provider value={value}>{children}</FitAuthContext.Provider>
}

export function FitAuthProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate()

  if (!isConfigured) {
    return <GuestAuthProvider>{children}</GuestAuthProvider>
  }

  const onRedirectCallback = (appState?: AppState) => {
    navigate(appState?.returnTo ?? '/app', { replace: true })
  }

  return (
    <Auth0Provider
      domain={domain}
      clientId={clientId}
      onRedirectCallback={onRedirectCallback}
      authorizationParams={{
        redirect_uri: `${window.location.origin}/callback`,
        audience: audience || undefined,
      }}
      cacheLocation="localstorage"
    >
      <Auth0Bridge>{children}</Auth0Bridge>
    </Auth0Provider>
  )
}

export function useFitAuth() {
  const value = useContext(FitAuthContext)

  if (!value) {
    throw new Error('useFitAuth must be used inside FitAuthProvider')
  }

  return value
}
