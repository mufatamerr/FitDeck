import { useEffect, useRef } from 'react'

import type { NormalizedLandmarkList } from '@mediapipe/holistic'
import { HAND_CONNECTIONS } from '@mediapipe/holistic'
import { drawConnectors, drawLandmarks } from '@mediapipe/drawing_utils'

type Props = {
  width: number
  height: number
  handLandmarks?: NormalizedLandmarkList | null
  lastGesture?: 'left' | 'right' | 'up' | 'fist' | null
}

export function HandDebugOverlay({
  width,
  height,
  handLandmarks,
  lastGesture,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.width = width
    canvas.height = height
  }, [height, width])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.clearRect(0, 0, width, height)

    if (handLandmarks && handLandmarks.length >= 21) {
      // Sharper, higher-contrast hand network for debugging.
      drawConnectors(ctx, handLandmarks, HAND_CONNECTIONS, {
        color: '#8b5cf6',
        lineWidth: 4,
      })
      drawLandmarks(ctx, handLandmarks, { color: '#e5e7eb', radius: 3 })

      // Emphasize tips + wrist.
      const tips = [0, 4, 8, 12, 16, 20]
      for (const idx of tips) {
        const p = handLandmarks[idx]
        ctx.beginPath()
        ctx.arc(p.x * width, p.y * height, idx === 0 ? 6 : 5, 0, Math.PI * 2)
        ctx.fillStyle = idx === 0 ? '#22c55e' : '#f59e0b'
        ctx.fill()
      }
    }

    if (lastGesture) {
      ctx.font = 'bold 22px system-ui'
      ctx.fillStyle =
        lastGesture === 'right'
          ? '#22c55e'
          : lastGesture === 'left'
            ? '#ef4444'
            : lastGesture === 'fist'
              ? '#f59e0b'
              : '#60a5fa'
      ctx.fillText(`GESTURE: ${lastGesture.toUpperCase()}`, 18, 34)
    }
  }, [handLandmarks, height, lastGesture, width])

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 z-30 h-full w-full"
      style={{ pointerEvents: 'none' }}
    />
  )
}

