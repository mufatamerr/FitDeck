import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ThemeProvider } from 'next-themes'
import { BrowserRouter } from 'react-router-dom'
import App from './App.tsx'
import { FitAuthProvider } from './auth/FitAuth.tsx'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
      <BrowserRouter>
        <FitAuthProvider>
          <App />
        </FitAuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  </StrictMode>,
)
