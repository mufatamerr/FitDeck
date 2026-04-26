import { useCallback, useRef } from 'react'

import type { NormalizedLandmarkList } from '@mediapipe/holistic'

const WINDOW_FRAMES = 15
const SWIPE_THRESHOLD = 0.10 // normalized delta (0..1)
const FLING_UP_THRESHOLD = 0.12 // normalized delta (0..1) in Y (negative => up)
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
  onFlingUp?: () => void,
) {
  const bufXRef = useRef<number[]>([])
  const bufYRef = useRef<number[]>([])
  const lastSwipeRef = useRef<number>(0)
  const lastGestureRef = useRef<'left' | 'right' | 'up' | null>(null)

  const ingest = useCallback(
    (
      hand: NormalizedLandmarkList | undefined | null,
      poseWristX?: number | null,
      poseWristY?: number | null,
    ) => {
      // Prefer hand wrist; fall back to pose wrist for arm-fling gestures
      const wristX =
        hand && hand.length >= 21 ? hand[0].x : poseWristX ?? null
      const wristY =
        hand && hand.length >= 21 ? hand[0].y : poseWristY ?? null

      if (wristX === null || wristY === null) {
        bufXRef.current = []
        bufYRef.current = []
        return
      }
      // If we have a hand, require open-ish hand; if we're using pose wrist (arm fling),
      // skip the open-hand constraint.
      if (hand && hand.length >= 21 && !isOpenHand(hand)) {
        bufXRef.current = []
        bufYRef.current = []
        return
      }

      const bx = bufXRef.current
      const by = bufYRef.current
      bx.push(wristX)
      by.push(wristY)
      if (bx.length < WINDOW_FRAMES || by.length < WINDOW_FRAMES) return
      if (bx.length > WINDOW_FRAMES) bx.shift()
      if (by.length > WINDOW_FRAMES) by.shift()

      const dx = bx[bx.length - 1] - bx[0]
      const dy = by[by.length - 1] - by[0]
      const now = Date.now()
      if (now - lastSwipeRef.current <= COOLDOWN_MS) return

      // Prefer a clear up fling over sideways swipes (user asked for fling-up = save).
      if (onFlingUp && dy < -FLING_UP_THRESHOLD && Math.abs(dy) > Math.abs(dx) * 1.1) {
        lastSwipeRef.current = now
        bufXRef.current = []
        bufYRef.current = []
        lastGestureRef.current = 'up'
        onFlingUp()
        return
      }

      if (Math.abs(dx) > SWIPE_THRESHOLD) {
        lastSwipeRef.current = now
        bufXRef.current = []
        bufYRef.current = []
        if (dx > 0) {
          lastGestureRef.current = 'right'
          onSwipeRight()
        } else {
          lastGestureRef.current = 'left'
          onSwipeLeft()
        }
      }
    },
    [onFlingUp, onSwipeLeft, onSwipeRight],
  )

  return { ingest, lastGestureRef }
}

