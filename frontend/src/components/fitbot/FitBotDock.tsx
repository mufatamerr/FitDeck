import { useAuth0 } from '@auth0/auth0-react'
import { useCallback, useState } from 'react'

import { useUiStore } from '../../store/uiStore'
import { FitBotPanel } from './FitBotPanel'
import { useVoiceWakeWord } from './useVoiceWakeWord'

/**
 * Floating FitBot entry + wake word listener (handoff §6).
 * Render once for all authenticated routes (see App layout).
 */
export function FitBotDock() {
  const { isAuthenticated } = useAuth0()
  const voiceWakeBlocked = useUiStore((s) => s.voiceWakeBlocked)
  const [open, setOpen] = useState(false)
  const [voicePrefill, setVoicePrefill] = useState<string | null>(null)

  const wakeEnabled = isAuthenticated && !open && !voiceWakeBlocked

  const onWake = useCallback(() => {
    setOpen(true)
  }, [])

  const onCommandText = useCallback((t: string) => {
    setOpen(true)
    setVoicePrefill(t)
  }, [])

  useVoiceWakeWord({
    enabled: wakeEnabled,
    onWake,
    onCommandText,
  })

  return (
    <>
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="fixed bottom-5 right-5 z-40 rounded-full bg-violet-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-900/40 hover:bg-violet-500"
        >
          FitBot
        </button>
      )}
      {open && (
        <FitBotPanel
          onClose={() => {
            setOpen(false)
            setVoicePrefill(null)
          }}
          voicePrefill={voicePrefill}
          onConsumedVoicePrefill={() => setVoicePrefill(null)}
        />
      )}
    </>
  )
}
