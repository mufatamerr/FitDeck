import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'

import { FitBotTestWidget } from '../components/fitbot/FitBotTestWidget'
import { useHeyFitBotWakeWord } from '../components/fitbot/useHeyFitBotWakeWord'
import { useUiStore } from '../store/uiStore'

const IDLE_CLOSE_MS = 10_000

export function FitBotTestPage() {
  const setVoiceWakeBlocked = useUiStore((s) => s.setVoiceWakeBlocked)
  const [open, setOpen] = useState(false)
  const [lastWakeAt, setLastWakeAt] = useState<number | null>(null)
  const idleTimerRef = useRef<number | null>(null)

  // Prevent the global FitBotDock listener from competing with this test.
  useEffect(() => {
    setVoiceWakeBlocked(true)
    return () => setVoiceWakeBlocked(false)
  }, [setVoiceWakeBlocked])

  const clearIdle = useCallback(() => {
    if (idleTimerRef.current) {
      window.clearTimeout(idleTimerRef.current)
      idleTimerRef.current = null
    }
  }, [])

  const armIdleClose = useCallback(() => {
    clearIdle()
    idleTimerRef.current = window.setTimeout(() => {
      setOpen(false)
      setLastWakeAt(null)
      idleTimerRef.current = null
    }, IDLE_CLOSE_MS)
  }, [clearIdle])

  const onWake = useCallback(() => {
    setOpen(true)
    setLastWakeAt(Date.now())
    armIdleClose()
  }, [armIdleClose])

  // Wake-word listener is enabled ONLY when the widget is closed.
  useHeyFitBotWakeWord({
    enabled: !open,
    onWake,
  })

  const activity = useMemo(
    () => () => {
      if (!open) return
      armIdleClose()
    },
    [armIdleClose, open],
  )

  useEffect(() => () => clearIdle(), [clearIdle])

  return (
    <main className="page-shell pb-24 pt-10">
      <div className="glass-panel px-6 py-8 sm:px-8">
        <p className="section-kicker">FitBot voice test</p>
        <h1 className="mt-4 font-display text-4xl text-white sm:text-5xl">Say “Hey FitBot”.</h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-zinc-300">
          This page is a dedicated test harness for the voice wake flow. It opens a small widget when you say
          “Hey FitBot”, listens for exactly one question, answers, then stops listening until the next wake.
          The widget auto-closes after 10 seconds of inactivity.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link to="/app" className="button-secondary">
            ← Back to app
          </Link>
          <button
            type="button"
            onClick={() => onWake()}
            className="button-primary"
          >
            Open widget (manual)
          </button>
          {lastWakeAt ? (
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs text-zinc-300">
              Last wake: {new Date(lastWakeAt).toLocaleTimeString()}
            </span>
          ) : null}
        </div>

        <div className="mt-8 rounded-2xl border border-white/10 bg-black/20 p-5 text-sm text-zinc-300">
          <p className="text-white">Expected behavior</p>
          <ul className="mt-3 list-inside list-disc space-y-2 text-zinc-400">
            <li>Say “Hey FitBot” → widget appears.</li>
            <li>Immediately ask a question (weather, outfit advice, etc.).</li>
            <li>FitBot answers, and the mic stops until you wake again.</li>
            <li>After 10 seconds with no activity, the widget closes.</li>
          </ul>
        </div>
      </div>

      <FitBotTestWidget
        open={open}
        onClose={() => {
          setOpen(false)
          setLastWakeAt(null)
          clearIdle()
        }}
        onActivity={activity}
      />
    </main>
  )
}

