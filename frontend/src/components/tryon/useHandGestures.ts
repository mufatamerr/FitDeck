import { useCallback, useRef } from 'react'

type Landmark = { x: number; y: number; z: number; visibility?: number }
type NormalizedLandmarkList = Landmark[]

type Gesture = 'left' | 'right' | 'fist' | null

type Options = {
  /** Called when a gesture is detected. */
  onLeft: () => void
  onRight: () => void
  onFist: () => void
  /** If true, mirror X so gestures match mirrored camera previews. */
  mirrorX?: boolean
}

// Tuned for responsiveness (less lag) while still filtering noise.
const WINDOW = 7
const COOLDOWN_MS = 650
const SWIPE_DX = 0.075 // normalized (0..1)

function isFist(hand: NormalizedLandmarkList): boolean {
  // Robust, rotation-tolerant fist heuristic:
  // For each finger, the tip should be closer to the wrist than the MCP joint (folded toward palm).
  // This avoids false positives when the hand is sideways (where y comparisons break).
  const dist = (a: number, b: number) => Math.hypot(hand[a].x - hand[b].x, hand[a].y - hand[b].y)

  const fingers: Array<{ tip: number; mcp: number }> = [
    { tip: 8, mcp: 5 }, // index
    { tip: 12, mcp: 9 }, // middle
    { tip: 16, mcp: 13 }, // ring
    { tip: 20, mcp: 17 }, // pinky
  ]

  const folded = fingers.reduce((acc, f) => {
    const tipToWrist = dist(f.tip, 0)
    const mcpToWrist = dist(f.mcp, 0)
    // tip should be significantly closer than MCP if folded
    return acc + (tipToWrist < mcpToWrist * 0.82 ? 1 : 0)
  }, 0)

  // Compactness: tips cluster (index tip close to pinky tip).
  const tipSpread = dist(8, 20)
  // Thumb also tends to tuck in; keep optional but helpful.
  const thumbTucked = dist(4, 0) < dist(2, 0) * 0.95

  return folded >= 3 && tipSpread < 0.28 && (thumbTucked || folded === 4)
}

function ema(prev: number | null, next: number, a: number) {
  return prev == null ? next : prev + (next - prev) * a
}

export function useHandGestures({ onLeft, onRight, onFist, mirrorX = false }: Options) {
  const bufXRef = useRef<number[]>([])
  const lastAtRef = useRef<number>(0)
  const lastGestureRef = useRef<Gesture>(null)
  const fistStableRef = useRef<number>(0)
  const xEmaRef = useRef<number | null>(null)
  const fistNowRef = useRef<boolean>(false)

  const ingest = useCallback(
    (hand: NormalizedLandmarkList | null | undefined) => {
      if (!hand || hand.length < 21) {
        bufXRef.current = []
        fistStableRef.current = 0
        xEmaRef.current = null
        fistNowRef.current = false
        lastGestureRef.current = null
        return
      }

      const now = Date.now()
      fistNowRef.current = isFist(hand)
      const rawX = hand[0].x
      const xInput = mirrorX ? 1 - rawX : rawX

      if (now - lastAtRef.current <= COOLDOWN_MS) {
        // Still update smoothing buffers so we resume quickly after cooldown.
        const x = ema(xEmaRef.current, xInput, 0.35)
        xEmaRef.current = x
        const bx = bufXRef.current
        bx.push(x)
        if (bx.length > WINDOW) bx.shift()
        return
      }

      // Fist detection: require a few consecutive frames to avoid accidental triggers.
      if (fistNowRef.current) fistStableRef.current += 1
      else fistStableRef.current = 0

      if (fistStableRef.current >= 3) {
        fistStableRef.current = 0
        lastAtRef.current = now
        lastGestureRef.current = 'fist'
        onFist()
        bufXRef.current = []
        return
      }

      const x = ema(xEmaRef.current, xInput, 0.35)
      xEmaRef.current = x
      const bx = bufXRef.current
      bx.push(x)
      if (bx.length < WINDOW) return
      if (bx.length > WINDOW) bx.shift()

      const dx = bx[bx.length - 1] - bx[0]
      if (Math.abs(dx) < SWIPE_DX) return

      lastAtRef.current = now
      bufXRef.current = []

      if (dx > 0) {
        lastGestureRef.current = 'right'
        onRight()
      } else {
        lastGestureRef.current = 'left'
        onLeft()
      }
    },
    [onFist, onLeft, onRight],
  )

  return { ingest, lastGestureRef, fistNowRef }
}

