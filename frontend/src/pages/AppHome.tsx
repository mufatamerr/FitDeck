import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { HeroScrollDemo } from '../components/ui/demo'
import { useFitAuth } from '../auth/FitAuth'

const API = import.meta.env.VITE_API_URL || 'http://127.0.0.1:5000'
const DASHBOARD_VIDEO = 'https://www.pexels.com/download/video/8346468/'

type SyncData = { role?: string; name?: string; email?: string; onboarding_done?: boolean }

const NAV_LINKS = [
  { label: 'WARDROBE', path: '/app/wardrobe' },
  { label: 'CATALOG', path: '/app/discover' },
  { label: 'BUILDER', path: '/app/builder' },
  { label: 'CLOSET', path: '/app/closet' },
]

const stepVideos = [
  'https://www.pexels.com/download/video/3753696/',
  'https://www.pexels.com/download/video/9594848/',
  'https://www.pexels.com/download/video/9558222/',
]

const steps = [
  {
    number: '1',
    title: 'Upload Your Clothes',
    lines: [
      'Start uploading',
      'Snap a photo from your phone',
      'AI removes the background',
      'Clean cutout saved to your closet',
    ],
    video: stepVideos[0],
  },
  {
    number: '2',
    title: 'Set Your Style Profile',
    lines: [
      'Take the quiz',
      'Pick your vibe and fit preference',
      'Choose your go-to colors',
      'Tell us your occasions',
      'Add style influences',
    ],
    video: stepVideos[1],
  },
  {
    number: '3',
    title: 'Get Curated Outfits',
    lines: [
      'See example outfits',
      'AI combines your real items',
      'Styled to your personal vibe',
    ],
    video: stepVideos[2],
  },
]

const faqs = [
  {
    q: 'How do I start building my FitDeck closet?',
    a: 'Start by uploading a few core pieces. The product is designed so your digital wardrobe can grow gradually instead of needing a full closet import on day one.',
  },
  {
    q: 'What does the style profile do?',
    a: 'It guides the AI toward your preferred vibe, fit direction, color choices, and occasions so recommendations feel personal rather than generic.',
  },
  {
    q: 'Can FitDeck use my real clothes?',
    a: 'Yes. The handoff is built around real wardrobe uploads, background removal, digital closet storage, and outfit generation from those items.',
  },
  {
    q: 'What happens after I get outfit suggestions?',
    a: 'From there the flow can move into try-on, styling adjustments, saved looks, and future FitBot support from the rest of the project roadmap.',
  },
]

const infoSections = [
  {
    title: 'About',
    body: 'FitDeck is a BearHacks 2026 fashion-tech build combining wardrobe upload, AI styling, virtual try-on, and a catalog system into one fashion-first product.',
  },
  {
    title: 'Terms of Service',
    body: 'Users must only upload content they have permission to use, must not submit harmful or infringing material, and understand that AI try-on and styling outputs are recommendation tools.',
  },
  {
    title: 'Contact',
    body: 'For project support, demo questions, or team contact, use the FitDeck hackathon contact path or the project admin channel referenced in the handoff.',
  },
]

export function AppHome() {
  const navigate = useNavigate()
  const { user, logout, getAccessTokenSilently, isAuthenticated, isConfigured } = useFitAuth()
  const [sync, setSync] = useState<SyncData | null>(null)
  const [activeStep, setActiveStep] = useState(0)
  const stepRefs = useRef<Array<HTMLElement | null>>([])

  const runSync = useCallback(async () => {
    if (!isConfigured || !isAuthenticated) return
    try {
      const audience = import.meta.env.VITE_AUTH0_AUDIENCE
      const token = await getAccessTokenSilently({
        authorizationParams: audience ? { audience } : undefined,
      })
      const pendingName = localStorage.getItem('fitdeck_pending_name')
      const res = await fetch(`${API}/auth/sync`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: pendingName ? JSON.stringify({ display_name: pendingName }) : undefined,
      })
      if (pendingName) localStorage.removeItem('fitdeck_pending_name')
      if (!res.ok) return
      const data = (await res.json()) as SyncData
      setSync(data)
      if (data.role === 'admin') navigate('/admin-dashboard', { replace: true })
    } catch {
      /* non-critical */
    }
  }, [getAccessTokenSilently, isAuthenticated, isConfigured, navigate])

  useEffect(() => {
    void runSync()
  }, [runSync])

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visibleEntries = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)

        const current = visibleEntries[0]
        if (!current) return

        const index = Number(current.target.getAttribute('data-step-index'))
        if (!Number.isNaN(index)) {
          setActiveStep(index)
        }
      },
      {
        threshold: [0.35, 0.55, 0.75],
        rootMargin: '-15% 0px -25% 0px',
      },
    )

    const elements = stepRefs.current.filter(Boolean)
    elements.forEach((element) => {
      if (element) observer.observe(element)
    })

    return () => {
      observer.disconnect()
    }
  }, [])

  const displayName = sync?.name || user?.name || 'there'
  const welcomeName = displayName.includes('@') ? 'there' : displayName.split(' ')[0]

  return (
    <div
      style={{
        width: '100%',
        minHeight: '100vh',
        overflowY: 'auto',
        background: '#080808',
        color: '#f5f1ea',
        fontFamily: "'DM Sans',sans-serif",
      }}
    >
      <div style={{ position: 'relative', minHeight: '100vh' }}>
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'radial-gradient(circle at top, rgba(255,255,255,0.06), transparent 26%), linear-gradient(180deg, #0a0a0a 0%, #080808 100%)',
            pointerEvents: 'none',
          }}
        />

        <nav
          style={{
            position: 'sticky',
            top: 0,
            zIndex: 40,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '24px 44px',
            background: 'rgba(8,8,8,0.78)',
            backdropFilter: 'blur(14px)',
            borderBottom: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          <button
            onClick={() => navigate('/app')}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#f5f1ea',
              fontSize: 13,
              fontWeight: 500,
              letterSpacing: '0.22em',
              padding: 0,
            }}
          >
            FITDECK
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
            {NAV_LINKS.map((link) => (
              <button
                key={link.path}
                onClick={() => navigate(link.path)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#d7d0c7',
                  fontSize: 10,
                  letterSpacing: '0.22em',
                  padding: 0,
                }}
              >
                {link.label}
              </button>
            ))}
            <button
              onClick={() => logout({ logoutParams: { returnTo: window.location.origin } })}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: '#bdb5aa',
                fontSize: 10,
                letterSpacing: '0.22em',
                padding: 0,
              }}
            >
              SIGN OUT
            </button>
          </div>
        </nav>

        <main style={{ position: 'relative', zIndex: 2, padding: '24px 44px 80px' }}>
          <section>
            <HeroScrollDemo
              videoSrc={DASHBOARD_VIDEO}
              titleComponent={
                <div className="mx-auto max-w-3xl">
                  <p className="text-[10px] uppercase tracking-[0.32em] text-[#d8d1c7]">
                    YOUR FITTING ROOM
                  </p>
                  <h1 className="mt-6 font-['Cormorant_Garamond'] text-[clamp(44px,8vw,104px)] font-light leading-[0.88] tracking-[-0.04em] text-[#faf6ef]">
                    Welcome,
                    <br />
                    <em className="font-light italic">{welcomeName}.</em>
                  </h1>
                  <p className="mx-auto mt-6 max-w-xl text-sm leading-7 tracking-[0.08em] text-[#e5ddd3] md:text-[13px]">
                    Upload your wardrobe, refine your style profile, and move from raw
                    pieces to AI-curated outfits inside the same flow.
                  </p>
                  <div className="mt-8 flex items-center justify-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-full border border-white/20 text-sm text-[#f5efe7]">
                      ↓
                    </span>
                    <span className="text-[10px] tracking-[0.24em] text-[#d7d0c7]">
                      SCROLL TO EXPLORE
                    </span>
                  </div>
                </div>
              }
              primaryAction={
                <button
                  onClick={() => navigate('/app/wardrobe')}
                  className="border-0 bg-[#f1ece3] px-9 py-4 text-[10.5px] font-medium tracking-[0.22em] text-[#090909]"
                >
                  OPEN WARDROBE
                </button>
              }
              secondaryAction={
                <button
                  onClick={() => navigate('/app/builder')}
                  className="border border-white/20 bg-transparent px-9 py-4 text-[10.5px] font-normal tracking-[0.22em] text-[#f1ece3]"
                >
                  BUILD LOOKS
                </button>
              }
              meta={[
                { label: 'PROFILE', value: sync?.email || user?.email || 'Preview' },
              ]}
            />
          </section>

          <section style={{ marginTop: 110 }}>
            <div
              style={{
                display: 'grid',
                gap: 28,
                alignItems: 'start',
                gridTemplateColumns: 'minmax(320px, 0.8fr) minmax(0, 1.2fr)',
              }}
            >
              <div>
                <p style={{ fontSize: 10, letterSpacing: '0.3em', color: '#d8d1c7', marginBottom: 18 }}>
                  HOW IT WORKS
                </p>
                <h2
                  style={{
                    fontFamily: "'Cormorant Garamond', Georgia, serif",
                    fontSize: 'clamp(34px, 4vw, 60px)',
                    lineHeight: 0.94,
                    fontWeight: 300,
                    color: '#faf6ef',
                    margin: 0,
                  }}
                >
                  Your wardrobe,
                  <br />
                  mapped into FitDeck.
                </h2>
              </div>

              <div
                style={{
                  position: 'sticky',
                  top: 100,
                  height: 320,
                  border: '1px solid rgba(255,255,255,0.1)',
                  background: 'rgba(255,255,255,0.03)',
                  overflow: 'hidden',
                }}
              >
                <video
                  key={steps[activeStep].video}
                  autoPlay
                  loop
                  muted
                  playsInline
                  src={steps[activeStep].video}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    filter: 'grayscale(0.2) contrast(1.02) brightness(0.86)',
                  }}
                />
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    background:
                      'linear-gradient(180deg, rgba(8,8,8,0.12), rgba(8,8,8,0.36)), radial-gradient(ellipse 70% 70% at 50% 44%, transparent 28%, rgba(0,0,0,0.5) 100%)',
                  }}
                />
              </div>
            </div>

            <div style={{ marginTop: 34, display: 'grid', gap: 1 }}>
              {steps.map((step, index) => (
                <article
                  key={step.number}
                  ref={(element) => {
                    stepRefs.current[index] = element
                  }}
                  data-step-index={index}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '80px minmax(0, 1fr)',
                    gap: 20,
                    padding: '28px 0',
                    borderTop: '1px solid rgba(255,255,255,0.08)',
                    opacity: activeStep === index ? 1 : 0.72,
                    transition: 'opacity 180ms ease',
                  }}
                >
                  <div style={{ fontSize: 26, color: '#faf6ef', fontWeight: 500 }}>
                    {step.number}
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: 22, color: '#faf6ef', fontWeight: 500 }}>
                      {step.title}
                    </h3>
                    <div style={{ marginTop: 10 }}>
                      {step.lines.map((line) => (
                        <p
                          key={line}
                          style={{
                            margin: '0 0 6px',
                            fontSize: 13,
                            color: '#e0d9d0',
                            letterSpacing: '0.03em',
                            lineHeight: 1.7,
                          }}
                        >
                          {line}
                        </p>
                      ))}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section style={{ marginTop: 110 }}>
            <div
              style={{
                display: 'grid',
                gap: 1,
                gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                borderTop: '1px solid rgba(255,255,255,0.08)',
              }}
            >
              <div style={{ padding: '34px 28px 24px 0', borderRight: '1px solid rgba(255,255,255,0.08)' }}>
                <p style={{ fontSize: 10, letterSpacing: '0.3em', color: '#d8d1c7', marginBottom: 16 }}>
                  FAQ
                </p>
                {faqs.map((item) => (
                  <details
                    key={item.q}
                    style={{
                      borderTop: '1px solid rgba(255,255,255,0.08)',
                      padding: '18px 0',
                    }}
                  >
                    <summary
                      style={{
                        listStyle: 'none',
                        cursor: 'pointer',
                        fontSize: 17,
                        color: '#faf6ef',
                        fontWeight: 500,
                      }}
                    >
                      {item.q}
                    </summary>
                    <p
                      style={{
                        marginTop: 12,
                        maxWidth: 580,
                        fontSize: 13,
                        lineHeight: 1.8,
                        color: '#e0d9d0',
                      }}
                    >
                      {item.a}
                    </p>
                  </details>
                ))}
              </div>

              <div style={{ padding: '34px 0 24px 28px' }}>
                <p style={{ fontSize: 10, letterSpacing: '0.3em', color: '#d8d1c7', marginBottom: 16 }}>
                  INFO
                </p>
                {infoSections.map((section) => (
                  <div
                    key={section.title}
                    style={{
                      borderTop: '1px solid rgba(255,255,255,0.08)',
                      padding: '18px 0 20px',
                    }}
                  >
                    <h3 style={{ margin: 0, fontSize: 17, color: '#faf6ef', fontWeight: 500 }}>
                      {section.title}
                    </h3>
                    <p
                      style={{
                        marginTop: 12,
                        maxWidth: 540,
                        fontSize: 13,
                        lineHeight: 1.8,
                        color: '#e0d9d0',
                      }}
                    >
                      {section.body}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  )
}
