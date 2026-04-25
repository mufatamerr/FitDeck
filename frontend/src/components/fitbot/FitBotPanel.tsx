import { useAuth0 } from '@auth0/auth0-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { useOutfitStore } from '../../store/outfitStore'
import { ApiClient } from '../../services/api'
import { Waveform } from './Waveform'

const apiBase = import.meta.env.VITE_API_URL || 'http://127.0.0.1:5000'

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

type Props = {
  onClose: () => void
  voicePrefill?: string | null
  onConsumedVoicePrefill?: () => void
}

type Msg = { role: 'user' | 'bot'; text: string }

type FitBotConfig = {
  default_location: string
  default_include_weather: boolean
  gemma_model: string
  gemma_configured: boolean
  weather_configured: boolean
  tts_configured: boolean
  tts_voice_id: string
}

export function FitBotPanel({ onClose, voicePrefill, onConsumedVoicePrefill }: Props) {
  const { getAccessTokenSilently } = useAuth0()
  const api = useMemo(() => new ApiClient(apiBase, getAccessTokenSilently), [getAccessTokenSilently])
  const audience = import.meta.env.VITE_AUTH0_AUDIENCE
  const currentOutfit = useOutfitStore((s) => s.currentOutfit)

  const [cfg, setCfg] = useState<FitBotConfig | null>(null)
  const [cfgErr, setCfgErr] = useState<string | null>(null)
  const [queryLocation, setQueryLocation] = useState('Mississauga,CA')
  const [includeWeather, setIncludeWeather] = useState(true)

  const [msgs, setMsgs] = useState<Msg[]>([
    {
      role: 'bot',
      text: 'Hi — I’m FitBot. Ask about fits and weather, use the mic, or say “Hey FitDeck” anytime.',
    },
  ])
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const [autoSpeak, setAutoSpeak] = useState(true)
  const [micBusy, setMicBusy] = useState(false)
  const [ttsPlaying, setTtsPlaying] = useState(false)
  const [ttsError, setTtsError] = useState<string | null>(null)

  const audioRef = useRef<HTMLAudioElement | null>(null)
  const micRecRef = useRef<AnyRec | null>(null)
  const sendingRef = useRef(false)

  const stopMic = useCallback(() => {
    try {
      micRecRef.current?.stop()
    } catch {
      /* ignore */
    }
    micRecRef.current = null
    setMicBusy(false)
  }, [])

  useEffect(() => () => stopMic(), [stopMic])

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      setCfgErr(null)
      try {
        const c = await api.fetchJson<FitBotConfig>('/fitbot/config', {}, audience)
        if (cancelled) return
        setCfg(c)
        setQueryLocation(c.default_location)
        setIncludeWeather(c.default_include_weather)
        const bits: string[] = []
        if (!c.gemma_configured) bits.push('Set GOOGLE_AI_STUDIO_API_KEY for text replies.')
        if (!c.weather_configured) bits.push('Set OPENWEATHER_API_KEY for weather.')
        if (!c.tts_configured) bits.push('Set ELEVENLABS_API_KEY for voice playback.')
        if (bits.length) {
          setMsgs([{ role: 'bot', text: `Hi — I’m FitBot.\n\n${bits.join(' ')}` }])
        }
      } catch (e) {
        if (!cancelled) setCfgErr(e instanceof Error ? e.message : 'Config failed')
      }
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [api, audience])

  const speak = useCallback(
    async (raw: string) => {
      const t = raw.trim()
      if (!t) return
      setTtsError(null)
      try {
        const token = await getAccessTokenSilently(
          audience ? { authorizationParams: { audience } } : undefined,
        )
        const r = await fetch(`${apiBase}/fitbot/speak`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: t }),
        })
        const ct = r.headers.get('content-type') || ''
        if (!r.ok) {
          let msg = 'Voice unavailable (check ELEVENLABS_API_KEY on the API).'
          try {
            const err = (await r.json()) as { error?: string; detail?: string }
            if (err.detail) msg = err.detail
            else if (err.error) msg = err.error
          } catch {
            /* ignore */
          }
          setTtsError(msg)
          return
        }
        if (!ct.includes('audio') && !ct.includes('mpeg')) {
          setTtsError('Voice unavailable (check ELEVENLABS_API_KEY on the API).')
          return
        }
        const blob = await r.blob()
        const url = URL.createObjectURL(blob)
        if (!audioRef.current) audioRef.current = new Audio()
        const el = audioRef.current
        el.onended = () => {
          setTtsPlaying(false)
          URL.revokeObjectURL(url)
        }
        el.onerror = () => {
          setTtsPlaying(false)
          URL.revokeObjectURL(url)
        }
        el.src = url
        setTtsPlaying(true)
        await el.play()
      } catch {
        setTtsPlaying(false)
        setTtsError('Could not play voice reply.')
      }
    },
    [audience, getAccessTokenSilently],
  )

  const sendWithText = useCallback(
    async (raw: string) => {
      const t = raw.trim()
      if (!t || sendingRef.current) return
      sendingRef.current = true
      setMsgs((m) => [...m, { role: 'user', text: t }])
      setLoading(true)
      setTtsError(null)
      try {
        const outfitPayload =
          currentOutfit.items.length > 0
            ? {
                name: currentOutfit.name,
                items: currentOutfit.items.map((i) => ({
                  name: i.name,
                  brand: i.brand,
                  category: i.category,
                })),
              }
            : undefined

        const res = await api.fetchJson<{ reply: string; detail?: string }>(
          '/fitbot',
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              message: t,
              include_weather: includeWeather,
              location: queryLocation.trim() || undefined,
              current_outfit: outfitPayload,
            }),
          },
          audience,
        )
        const botText = res.detail?.trim() ? `${res.reply}\n\n(${res.detail})` : res.reply
        setMsgs((m) => [...m, { role: 'bot', text: botText }])
        setText('')
        if (autoSpeak) void speak(res.reply)
      } catch (e) {
        setMsgs((m) => [
          ...m,
          { role: 'bot', text: `Error: ${e instanceof Error ? e.message : 'failed'}` },
        ])
      } finally {
        sendingRef.current = false
        setLoading(false)
      }
    },
    [api, audience, autoSpeak, currentOutfit.items, currentOutfit.name, includeWeather, queryLocation, speak],
  )

  const prefillSentRef = useRef<string | null>(null)
  useEffect(() => {
    if (!voicePrefill?.trim()) {
      prefillSentRef.current = null
      return
    }
    if (prefillSentRef.current === voicePrefill) return
    prefillSentRef.current = voicePrefill
    const t = voicePrefill.trim()
    onConsumedVoicePrefill?.()
    void sendWithText(t)
  }, [voicePrefill, onConsumedVoicePrefill, sendWithText])

  const send = () => void sendWithText(text)

  const toggleMic = () => {
    const Ctor = getRecognitionCtor()
    if (!Ctor) return
    if (micBusy) {
      stopMic()
      return
    }
    const rec = new Ctor()
    micRecRef.current = rec
    rec.continuous = false
    rec.interimResults = false
    rec.lang = 'en-US'
    setMicBusy(true)
    rec.onresult = (event: { resultIndex: number; results: { length: number; [i: number]: { 0: { transcript: string } } } }) => {
      let said = ''
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        said += event.results[i][0].transcript
      }
      const t = said.trim()
      if (t) setText((prev) => (prev.trim() ? `${prev.trim()} ${t}` : t))
    }
    rec.onerror = () => stopMic()
    rec.onend = () => stopMic()
    try {
      rec.start()
    } catch {
      stopMic()
    }
  }

  const stopTts = () => {
    try {
      audioRef.current?.pause()
    } catch {
      /* ignore */
    }
    setTtsPlaying(false)
  }

  return (
    <>
      <button
        type="button"
        className="fixed inset-0 z-[60] bg-black/50 md:bg-black/40"
        aria-label="Close FitBot"
        onClick={onClose}
      />
      <div className="fixed inset-x-0 bottom-0 z-[70] flex max-h-[min(72vh,640px)] flex-col rounded-t-2xl border border-white/10 border-b-0 bg-zinc-950/95 shadow-2xl backdrop-blur-md transition-transform">
        <div className="flex shrink-0 items-center justify-between border-b border-white/10 px-4 py-3">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-widest text-violet-300/90">FitBot</p>
              <p className="truncate text-sm text-zinc-400">
                {cfg
                  ? `Model ${cfg.gemma_model} · voice ${cfg.tts_voice_id.slice(0, 8)}…`
                  : 'Loading config…'}
              </p>
            </div>
            <Waveform active={ttsPlaying} className="shrink-0" />
          </div>
          <div className="flex items-center gap-2">
            <label className="flex cursor-pointer items-center gap-1.5 whitespace-nowrap text-xs text-zinc-400">
              <input
                type="checkbox"
                checked={includeWeather}
                onChange={(e) => setIncludeWeather(e.target.checked)}
                className="rounded border-white/20 bg-black/40"
              />
              Weather
            </label>
            <label className="flex cursor-pointer items-center gap-1.5 whitespace-nowrap text-xs text-zinc-400">
              <input
                type="checkbox"
                checked={autoSpeak}
                onChange={(e) => setAutoSpeak(e.target.checked)}
                className="rounded border-white/20 bg-black/40"
              />
              Auto voice
            </label>
            {ttsPlaying && (
              <button
                type="button"
                onClick={stopTts}
                className="rounded-lg border border-white/15 px-2 py-1 text-xs text-zinc-200 hover:bg-white/10"
              >
                Stop
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="rounded-full bg-black/40 px-3 py-2 text-sm text-zinc-200 hover:bg-black/55"
            >
              ✕
            </button>
          </div>
        </div>

        {cfgErr && (
          <p className="shrink-0 border-b border-amber-500/20 bg-amber-950/30 px-4 py-2 text-xs text-amber-200">
            {cfgErr}
          </p>
        )}

        {cfg && (
          <div className="shrink-0 space-y-2 border-b border-white/10 px-4 py-2">
            <div className="flex flex-wrap gap-2 text-[10px] uppercase tracking-wide">
              <span className={cfg.gemma_configured ? 'text-emerald-400' : 'text-amber-300'}>
                Gemma {cfg.gemma_configured ? '✓' : '✕'}
              </span>
              <span className={cfg.weather_configured ? 'text-emerald-400' : 'text-amber-300'}>
                Weather {cfg.weather_configured ? '✓' : '✕'}
              </span>
              <span className={cfg.tts_configured ? 'text-emerald-400' : 'text-amber-300'}>
                ElevenLabs {cfg.tts_configured ? '✓' : '✕'}
              </span>
            </div>
            <label className="flex flex-col gap-1">
              <span className="text-[10px] uppercase tracking-wider text-zinc-500">
                Default weather location (OpenWeather <code className="text-zinc-400">q</code>)
              </span>
              <input
                value={queryLocation}
                onChange={(e) => setQueryLocation(e.target.value)}
                placeholder="Mississauga,CA"
                className="rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-xs text-white placeholder:text-zinc-600"
              />
            </label>
          </div>
        )}

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4">
          {msgs.map((m, i) => (
            <div key={i} className="flex flex-col gap-1">
              <div
                className={[
                  'max-w-[90%] rounded-2xl px-4 py-3 text-sm',
                  m.role === 'user'
                    ? 'ml-auto bg-violet-600 text-white'
                    : 'mr-auto border border-white/10 bg-white/5 text-zinc-100',
                ].join(' ')}
              >
                {m.text}
              </div>
              {m.role === 'bot' && (
                <button
                  type="button"
                  onClick={() => void speak(m.text)}
                  className="mr-auto text-xs text-violet-300/90 hover:text-violet-200"
                >
                  Play voice
                </button>
              )}
            </div>
          ))}
        </div>

        <div className="shrink-0 border-t border-white/10 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          {ttsError && <p className="mb-2 text-center text-xs text-amber-200/90">{ttsError}</p>}
          <div className="flex gap-2">
            <button
              type="button"
              title="Speak your question"
              onClick={toggleMic}
              className={[
                'flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border text-lg',
                micBusy
                  ? 'border-red-400/50 bg-red-950/40 text-red-200'
                  : 'border-white/15 bg-white/5 text-zinc-200 hover:bg-white/10',
              ].join(' ')}
            >
              {micBusy ? '●' : '🎤'}
            </button>
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') send()
              }}
              placeholder={
                queryLocation
                  ? `e.g. Wednesday in ${queryLocation.split(',')[0]}?`
                  : 'Ask about your outfit or the weather…'
              }
              className="min-w-0 flex-1 rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white placeholder:text-zinc-500"
            />
            <button
              type="button"
              disabled={loading}
              onClick={send}
              className="shrink-0 rounded-xl bg-violet-600 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"
            >
              {loading ? '…' : 'Send'}
            </button>
          </div>
          <p className="mt-2 text-center text-[11px] text-zinc-500">
            Say <span className="text-zinc-300">“Hey FitDeck”</span> from any screen (except Try-On) to open me hands-free.
          </p>
        </div>
      </div>
    </>
  )
}
