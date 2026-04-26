import { useEffect, useRef } from 'react'

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

function transcriptIncludesWake(text: string): boolean {
  const t = text.toLowerCase().replace(/\s+/g, ' ')
  return t.includes('hey fitbot') || t.includes('hey fit bot')
}

type Options = {
  enabled: boolean
  onWake: () => void
}

/**
 * Minimal continuous Web Speech wake-word listener for "Hey FitBot".
 * Stops recognition as soon as wake is detected and does NOT auto-restart.
 */
export function useHeyFitBotWakeWord({ enabled, onWake }: Options) {
  const onWakeRef = useRef(onWake)
  onWakeRef.current = onWake
  const recRef = useRef<AnyRec | null>(null)

  useEffect(() => {
    if (!enabled) {
      try {
        recRef.current?.stop()
      } catch {
        /* ignore */
      }
      recRef.current = null
      return
    }

    const Ctor = getRecognitionCtor()
    if (!Ctor) return

    try {
      recRef.current?.stop()
    } catch {
      /* ignore */
    }

    const rec = new Ctor()
    recRef.current = rec
    rec.continuous = true
    rec.interimResults = true
    rec.lang = 'en-US'

    rec.onresult = (event: { results: { length: number; [i: number]: { 0: { transcript: string } } } }) => {
      let full = ''
      for (let i = 0; i < event.results.length; i += 1) {
        full += event.results[i][0].transcript
      }
      if (!transcriptIncludesWake(full)) return
      try {
        rec.stop()
      } catch {
        /* ignore */
      }
      onWakeRef.current()
    }

    rec.onerror = () => {
      // Keep quiet; caller can show fallback UI if desired.
    }

    rec.onend = () => {
      // Do not auto-restart: the test flow controls when wake listening resumes.
      if (recRef.current === rec) recRef.current = null
    }

    try {
      rec.start()
    } catch {
      /* ignore */
    }

    return () => {
      try {
        rec.stop()
      } catch {
        /* ignore */
      }
      if (recRef.current === rec) recRef.current = null
    }
  }, [enabled])
}

