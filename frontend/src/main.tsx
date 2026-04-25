import { Auth0Provider, type AppState } from '@auth0/auth0-react'
import { StrictMode, type ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, useNavigate } from 'react-router-dom'
import App from './App.tsx'
import './index.css'

const domain = import.meta.env.VITE_AUTH0_DOMAIN
const clientId = import.meta.env.VITE_AUTH0_CLIENT_ID
const audience = import.meta.env.VITE_AUTH0_AUDIENCE

function Auth0Wrapper({ children }: { children: ReactNode }) {
  const navigate = useNavigate()

  const onRedirectCallback = (appState?: AppState) => {
    navigate(appState?.returnTo ?? '/app', { replace: true })
  }

  if (!domain || !clientId || domain.includes('your-tenant')) {
    return (
      <div className="mx-auto max-w-lg px-6 py-16 text-left">
        <h1 className="text-2xl text-white" style={{ fontFamily: 'Georgia, serif' }}>
          Configure Auth0
        </h1>
        <p className="mt-4 text-zinc-400">
          Copy <code className="text-violet-300">.env.example</code> to{' '}
          <code className="text-violet-300">frontend/.env.local</code> and set{' '}
          <code className="text-violet-300">VITE_AUTH0_DOMAIN</code>,{' '}
          <code className="text-violet-300">VITE_AUTH0_CLIENT_ID</code>, and{' '}
          <code className="text-violet-300">VITE_AUTH0_AUDIENCE</code>. Then restart{' '}
          <code className="text-violet-300">npm run dev</code>.
        </p>
      </div>
    )
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
      {children}
    </Auth0Provider>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Auth0Wrapper>
        <App />
      </Auth0Wrapper>
    </BrowserRouter>
  </StrictMode>,
)
