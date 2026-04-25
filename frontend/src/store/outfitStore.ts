import { create } from 'zustand'

import type { ClothingItem, Outfit } from '../types'

type State = {
  currentOutfit: Outfit
  setItem: (item: ClothingItem) => void
  removeCategory: (category: ClothingItem['category']) => void
  clear: () => void
}

const emptyOutfit: Outfit = { id: 'local', name: 'My Fit', items: [] }

export const useOutfitStore = create<State>((set, get) => ({
  currentOutfit: emptyOutfit,
  setItem: (item) => {
    const prev = get().currentOutfit
    const nextItems = [
      ...prev.items.filter((i) => i.category !== item.category),
      item,
    ]
    set({ currentOutfit: { ...prev, items: nextItems } })
  },
  removeCategory: (category) => {
    const prev = get().currentOutfit
    set({
      currentOutfit: {
        ...prev,
        items: prev.items.filter((i) => i.category !== category),
      },
    })
  },
  clear: () => set({ currentOutfit: emptyOutfit }),
}))

