import { useState } from 'react'

import { FitBotPanel } from './FitBotPanel'

export function FitBotButton() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-5 right-5 z-40 rounded-full bg-violet-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-900/40 hover:bg-violet-500"
      >
        FitBot
      </button>
      {open && <FitBotPanel onClose={() => setOpen(false)} />}
    </>
  )
}

