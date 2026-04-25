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
  return t.includes('hey fitdeck') || t.includes('hey fit deck')
}

function stripWakePhrase(text: string): string {
  return text
    .replace(/hey\s+fit\s*deck/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

type Options = {
  enabled: boolean
  onWake: () => void
  onCommandText?: (text: string) => void
}

/**
 * Continuous Web Speech recognition for "Hey FitDeck" (handoff §6.1).
 * After wake, optional short capture for the rest of the question.
 */
export function useVoiceWakeWord({ enabled, onWake, onCommandText }: Options) {
  const onWakeRef = useRef(onWake)
  const onCommandRef = useRef(onCommandText)
  onWakeRef.current = onWake
  onCommandRef.current = onCommandText

  const mainRecRef = useRef<AnyRec | null>(null)
  const followRecRef = useRef<AnyRec | null>(null)
  const followTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const restartingRef = useRef(false)

  useEffect(() => {
    if (!enabled) {
      if (followTimerRef.current) {
        clearTimeout(followTimerRef.current)
        followTimerRef.current = null
      }
      try {
        followRecRef.current?.stop()
      } catch {
        /* ignore */
      }
      followRecRef.current = null
      try {
        mainRecRef.current?.stop()
      } catch {
        /* ignore */
      }
      mainRecRef.current = null
      return
    }

    const Ctor = getRecognitionCtor()
    if (!Ctor) return

    const stopFollow = () => {
      if (followTimerRef.current) {
        clearTimeout(followTimerRef.current)
        followTimerRef.current = null
      }
      try {
        followRecRef.current?.stop()
      } catch {
        /* ignore */
      }
      followRecRef.current = null
    }

    const restartMainSoon = () => {
      restartingRef.current = true
      window.setTimeout(() => {
        restartingRef.current = false
        try {
          mainRecRef.current?.start()
        } catch {
          /* ignore */
        }
      }, 450)
    }

    const startFollowCapture = () => {
      if (!onCommandRef.current) {
        restartMainSoon()
        return
      }

      stopFollow()
      const rec = new Ctor()
      followRecRef.current = rec
      rec.continuous = false
      rec.interimResults = false
      rec.lang = 'en-US'

      rec.onresult = (event: { resultIndex: number; results: { length: number; [i: number]: { 0: { transcript: string } } } }) => {
        let said = ''
        for (let i = event.resultIndex; i < event.results.length; i += 1) {
          said += event.results[i][0].transcript
        }
        stopFollow()
        const t = said.trim()
        if (t.length >= 2) onCommandRef.current?.(t)
        restartMainSoon()
      }

      rec.onerror = () => {
        stopFollow()
        try {
          mainRecRef.current?.start()
        } catch {
          /* ignore */
        }
      }

      rec.onend = () => {
        if (followRecRef.current === rec) followRecRef.current = null
      }

      try {
        rec.start()
      } catch {
        restartMainSoon()
        return
      }

      followTimerRef.current = setTimeout(() => {
        try {
          rec.stop()
        } catch {
          /* ignore */
        }
        followTimerRef.current = null
        try {
          mainRecRef.current?.start()
        } catch {
          /* ignore */
        }
      }, 6500)
    }

    try {
      mainRecRef.current?.stop()
    } catch {
      /* ignore */
    }

    const rec = new Ctor()
    mainRecRef.current = rec
    rec.continuous = true
    rec.interimResults = true
    rec.lang = 'en-US'

    rec.onresult = (event: { results: { length: number; [i: number]: { 0: { transcript: string } } } }) => {
      if (restartingRef.current) return
      let full = ''
      for (let i = 0; i < event.results.length; i += 1) {
        full += event.results[i][0].transcript
      }
      const lower = full.toLowerCase()
      if (!transcriptIncludesWake(lower)) return

      try {
        rec.stop()
      } catch {
        /* ignore */
      }

      const after = stripWakePhrase(full)
      onWakeRef.current()
      if (after.length >= 3) {
        onCommandRef.current?.(after)
        restartMainSoon()
      } else {
        startFollowCapture()
      }
    }

    rec.onerror = (e: { error: string }) => {
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') return
      window.setTimeout(() => {
        if (!enabled) return
        if (restartingRef.current || followRecRef.current) return
        try {
          if (mainRecRef.current === rec) rec.start()
        } catch {
          /* ignore */
        }
      }, 1200)
    }

    rec.onend = () => {
      if (!enabled || restartingRef.current || followRecRef.current) return
      window.setTimeout(() => {
        try {
          if (mainRecRef.current === rec) rec.start()
        } catch {
          /* ignore */
        }
      }, 300)
    }

    try {
      rec.start()
    } catch {
      /* ignore */
    }

    return () => {
      stopFollow()
      try {
        mainRecRef.current?.stop()
      } catch {
        /* ignore */
      }
      mainRecRef.current = null
    }
  }, [enabled, onWake, onCommandText])
}
