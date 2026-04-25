import { create } from 'zustand'

/** When true, FitBot wake listening pauses (e.g. full-screen Try-On uses mic/camera). */
type State = {
  voiceWakeBlocked: boolean
  setVoiceWakeBlocked: (blocked: boolean) => void
}

export const useUiStore = create<State>((set) => ({
  voiceWakeBlocked: false,
  setVoiceWakeBlocked: (blocked) => set({ voiceWakeBlocked: blocked }),
}))
