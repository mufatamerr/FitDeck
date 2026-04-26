import { useAuth0 } from '@auth0/auth0-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { ApiClient } from '../../services/api'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRec = any

function getRecognitionCtor(): (new () => AnyRec) | null {
  if (typeof window === 'undefined') return null
  const w = window as Window & {
    SpeechRecognition?: new () => AnyRec
    webkitSpeechRecognition?: new () => AnyRec
  }
  return w.SpeechRecognition || w.webkitSpeechRecognition || null
}

type Msg = { role: 'user' | 'bot'; text: string }

type Props = {
  open: boolean
  onClose: () => void
  /** Fired when a voice prompt has been captured (for resetting idle timer). */
  onActivity?: () => void
}

const apiBase = import.meta.env.VITE_API_URL || 'http://127.0.0.1:5000'

/**
 * Small FitBot test widget:
 * - When opened, captures ONE voice prompt automatically.
 * - Sends to POST /fitbot and shows reply.
 * - Stops listening immediately after capturing the prompt (until the next wake).
 */
export function FitBotTestWidget({ open, onClose, onActivity }: Props) {
  const { getAccessTokenSilently } = useAuth0()
  const api = useMemo(() => new ApiClient(apiBase, getAccessTokenSilently), [getAccessTokenSilently])
  const audience = import.meta.env.VITE_AUTH0_AUDIENCE

  const [msgs, setMsgs] = useState<Msg[]>([
    {
      role: 'bot',
      text: 'Say your question after the wake word. I’ll answer once, then wait for “Hey FitBot” again.',
    },
  ])
  const [listening, setListening] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const recRef = useRef<AnyRec | null>(null)
  const startedRef = useRef(false)

  const stopRec = useCallback(() => {
    try {
      recRef.current?.stop()
    } catch {
      /* ignore */
    }
    recRef.current = null
    setListening(false)
  }, [])

  const ask = useCallback(
    async (message: string) => {
      const t = message.trim()
      if (!t) return
      onActivity?.()
      setBusy(true)
      setError(null)
      setMsgs((m) => [...m, { role: 'user', text: t }])
      try {
        const r = await api.fetchJson<{ reply: string; detail?: string }>(
          '/fitbot',
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: t, include_weather: true }),
          },
          audience,
        )
        setMsgs((m) => [...m, { role: 'bot', text: r.reply || '…' }])
      } catch (e) {
        setError(e instanceof Error ? e.message : 'FitBot request failed')
      } finally {
        setBusy(false)
        onActivity?.()
      }
    },
    [api, audience, onActivity],
  )

  const startOneShotPromptCapture = useCallback(() => {
    const Ctor = getRecognitionCtor()
    if (!Ctor) {
      setError('SpeechRecognition is not supported in this browser. Try Chrome.')
      return
    }

    stopRec()
    setError(null)
    setListening(true)

    const rec = new Ctor()
    recRef.current = rec
    rec.continuous = false
    rec.interimResults = false
    rec.lang = 'en-US'

    const end = () => {
      if (recRef.current === rec) recRef.current = null
      setListening(false)
    }

    rec.onresult = (event: {
      resultIndex: number
      results: { length: number; [i: number]: { 0: { transcript: string } } }
    }) => {
      let said = ''
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        said += event.results[i][0].transcript
      }
      end()
      const t = said.trim()
      if (t.length >= 2) void ask(t)
    }

    rec.onerror = () => {
      end()
      setError('Mic error. Check permissions and try again.')
    }

    rec.onend = () => {
      end()
    }

    try {
      rec.start()
    } catch {
      end()
      setError('Could not start mic. Check browser permissions.')
      return
    }

    // Safety timeout so we don't hang forever.
    window.setTimeout(() => {
      if (recRef.current !== rec) return
      try {
        rec.stop()
      } catch {
        /* ignore */
      }
    }, 8000)
  }, [ask, stopRec])

  useEffect(() => {
    if (!open) return
    startedRef.current = false
    setError(null)
    // Reset to a clean one-turn state each open.
    setMsgs([
      {
        role: 'bot',
        text: 'Listening. Ask a weather or style question now.',
      },
    ])
    setBusy(false)

    // Start listening once video/mic stack is settled.
    const t = window.setTimeout(() => {
      if (startedRef.current) return
      startedRef.current = true
      startOneShotPromptCapture()
    }, 180)

    return () => {
      clearTimeout(t)
      stopRec()
    }
  }, [open, startOneShotPromptCapture, stopRec])

  if (!open) return null

  return (
    <div className="fixed bottom-5 right-5 z-[70] w-[360px] max-w-[92vw] rounded-2xl border border-white/10 bg-zinc-950/95 shadow-2xl shadow-black/50 backdrop-blur">
      <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-widest text-violet-300/90">FitBot test</p>
          <p className="mt-1 truncate text-xs text-zinc-400">
            Wake: “Hey FitBot” · One question per wake
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-zinc-300 hover:bg-white/5"
        >
          Close
        </button>
      </div>

      <div className="max-h-[42dvh] overflow-y-auto px-4 py-3">
        {msgs.map((m, i) => (
          <div key={i} className={m.role === 'user' ? 'text-right' : 'text-left'}>
            <div
              className={[
                'inline-block max-w-[92%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm leading-relaxed',
                m.role === 'user'
                  ? 'bg-violet-600/80 text-white'
                  : 'bg-white/5 text-zinc-200',
              ].join(' ')}
            >
              {m.text}
            </div>
          </div>
        ))}

        {error ? (
          <p className="mt-3 text-xs text-amber-200">{error}</p>
        ) : null}
      </div>

      <div className="border-t border-white/10 px-4 py-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs text-zinc-400">
            {busy ? 'Answering…' : listening ? 'Listening…' : 'Idle (say “Hey FitBot” again)'}
          </p>
          <button
            type="button"
            disabled={busy || listening}
            onClick={() => startOneShotPromptCapture()}
            className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white disabled:opacity-40"
          >
            Re-listen
          </button>
        </div>
        <p className="mt-2 text-[11px] text-zinc-500">
          After you ask a question, the mic stops until you wake again.
        </p>
      </div>
    </div>
  )
}

