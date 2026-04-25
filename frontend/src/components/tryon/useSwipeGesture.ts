import { useCallback, useRef } from 'react'

import type { NormalizedLandmarkList } from '@mediapipe/holistic'

const WINDOW_FRAMES = 15
const SWIPE_THRESHOLD = 0.10 // normalized delta (0..1)
const COOLDOWN_MS = 800

function isOpenHand(hand: NormalizedLandmarkList) {
  // indices: tips 8/12/16/20 compare vs pip 6/10/14/18 (y smaller => higher => extended)
  const fingerPairs: Array<[number, number]> = [
    [8, 6],
    [12, 10],
    [16, 14],
    [20, 18],
  ]
  const extendedCount = fingerPairs.reduce((acc, [tip, pip]) => {
    return acc + (hand[tip].y < hand[pip].y ? 1 : 0)
  }, 0)
  const fingersExtended = extendedCount >= 3
  // thumb is often occluded; treat as optional
  return fingersExtended
}

export function useSwipeGesture(
  onSwipeLeft: () => void,
  onSwipeRight: () => void,
) {
  const bufRef = useRef<number[]>([])
  const lastSwipeRef = useRef<number>(0)
  const lastGestureRef = useRef<'left' | 'right' | null>(null)

  const ingest = useCallback(
    (
      hand: NormalizedLandmarkList | undefined | null,
      poseWristX?: number | null,
    ) => {
      // Prefer hand wrist; fall back to pose wrist for arm-fling gestures
      const wristX =
        hand && hand.length >= 21 ? hand[0].x : poseWristX ?? null

      if (wristX === null) {
        bufRef.current = []
        return
      }
      // If we have a hand, require open-ish hand; if we're using pose wrist (arm fling),
      // skip the open-hand constraint.
      if (hand && hand.length >= 21 && !isOpenHand(hand)) {
        bufRef.current = []
        return
      }

      const buf = bufRef.current
      buf.push(wristX)
      if (buf.length < WINDOW_FRAMES) return
      if (buf.length > WINDOW_FRAMES) buf.shift()

      const delta = buf[buf.length - 1] - buf[0]
      const now = Date.now()
      if (Math.abs(delta) > SWIPE_THRESHOLD && now - lastSwipeRef.current > COOLDOWN_MS) {
        lastSwipeRef.current = now
        bufRef.current = []
        if (delta > 0) {
          lastGestureRef.current = 'right'
          onSwipeRight()
        } else {
          lastGestureRef.current = 'left'
          onSwipeLeft()
        }
      }
    },
    [onSwipeLeft, onSwipeRight],
  )

  return { ingest, lastGestureRef }
}

