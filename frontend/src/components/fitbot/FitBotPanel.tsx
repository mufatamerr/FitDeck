import { useAuth0 } from '@auth0/auth0-react'
import { useMemo, useRef, useState } from 'react'

import { ApiClient } from '../../services/api'

const apiBase = import.meta.env.VITE_API_URL || 'http://127.0.0.1:5000'

type Props = {
  onClose: () => void
}

type Msg = { role: 'user' | 'bot'; text: string }

export function FitBotPanel({ onClose }: Props) {
  const { getAccessTokenSilently } = useAuth0()
  const api = useMemo(() => new ApiClient(apiBase, getAccessTokenSilently), [getAccessTokenSilently])

  const [msgs, setMsgs] = useState<Msg[]>([
    { role: 'bot', text: 'Ask me anything about the fit. (Set GOOGLE_AI_STUDIO_API_KEY to enable replies.)' },
  ])
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const send = async () => {
    const t = text.trim()
    if (!t || loading) return
    setText('')
    setMsgs((m) => [...m, { role: 'user', text: t }])
    setLoading(true)
    try {
      const audience = import.meta.env.VITE_AUTH0_AUDIENCE
      const res = await api.fetchJson<{ reply: string }>(
        '/fitbot',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: t, include_weather: true }),
        },
        audience,
      )
      setMsgs((m) => [...m, { role: 'bot', text: res.reply }])
    } catch (e) {
      setMsgs((m) => [...m, { role: 'bot', text: `Error: ${e instanceof Error ? e.message : 'failed'}` }])
    } finally {
      setLoading(false)
    }
  }

  const speak = async (t: string) => {
    try {
      const audience = import.meta.env.VITE_AUTH0_AUDIENCE
      const token = await getAccessTokenSilently(
        audience ? { authorizationParams: { audience } } : undefined,
      )
      const r = await fetch(`${apiBase}/fitbot/speak`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: t }),
      })
      if (!r.ok) return
      const blob = await r.blob()
      const url = URL.createObjectURL(blob)
      if (!audioRef.current) audioRef.current = new Audio()
      audioRef.current.src = url
      await audioRef.current.play()
    } catch {
      // ignore
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 p-4">
      <div className="mx-auto flex h-full max-w-xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-zinc-950/70 shadow-2xl backdrop-blur">
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <div>
            <p className="text-xs uppercase tracking-widest text-violet-300/90">FitBot</p>
            <p className="text-sm text-zinc-400">AI stylist</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-black/40 px-3 py-2 text-sm text-zinc-200 hover:bg-black/55"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
          {msgs.map((m, i) => (
            <div
              key={i}
              className={[
                'max-w-[85%] rounded-2xl px-4 py-3 text-sm',
                m.role === 'user'
                  ? 'ml-auto bg-violet-600 text-white'
                  : 'mr-auto border border-white/10 bg-white/5 text-zinc-100',
              ].join(' ')}
              onDoubleClick={() => m.role === 'bot' && void speak(m.text)}
              title={m.role === 'bot' ? 'Double-click to speak (ElevenLabs)' : undefined}
            >
              {m.text}
            </div>
          ))}
        </div>

        <div className="border-t border-white/10 p-3">
          <div className="flex gap-2">
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void send()
              }}
              placeholder="Ask about weather, layers, etc."
              className="flex-1 rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white placeholder:text-zinc-500"
            />
            <button
              type="button"
              disabled={loading}
              onClick={() => void send()}
              className="rounded-xl bg-violet-600 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"
            >
              {loading ? '…' : 'Send'}
            </button>
          </div>
          <p className="mt-2 text-xs text-zinc-500">
            Tip: double-click a bot message to speak (requires ElevenLabs keys).
          </p>
        </div>
      </div>
    </div>
  )
}

