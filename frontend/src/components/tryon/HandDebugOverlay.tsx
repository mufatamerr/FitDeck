import { useEffect, useRef } from 'react'

import type { NormalizedLandmarkList } from '@mediapipe/holistic'
import { HAND_CONNECTIONS } from '@mediapipe/holistic'
import { drawConnectors, drawLandmarks } from '@mediapipe/drawing_utils'

type Props = {
  width: number
  height: number
  handLandmarks?: NormalizedLandmarkList | null
  poseWrist?: { x: number; y: number } | null
  lastGesture?: 'left' | 'right' | null
}

export function HandDebugOverlay({
  width,
  height,
  handLandmarks,
  poseWrist,
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
      drawConnectors(ctx, handLandmarks, HAND_CONNECTIONS, {
        color: '#22c55e',
        lineWidth: 3,
      })
      drawLandmarks(ctx, handLandmarks, { color: '#a78bfa', radius: 4 })
    }

    if (poseWrist) {
      ctx.beginPath()
      ctx.arc(poseWrist.x * width, poseWrist.y * height, 8, 0, Math.PI * 2)
      ctx.fillStyle = '#f59e0b'
      ctx.fill()
    }

    if (lastGesture) {
      ctx.font = 'bold 22px system-ui'
      ctx.fillStyle = lastGesture === 'right' ? '#22c55e' : '#ef4444'
      ctx.fillText(`GESTURE: ${lastGesture.toUpperCase()}`, 18, 34)
    }
  }, [handLandmarks, height, lastGesture, poseWrist, width])

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 z-30 h-full w-full"
      style={{ pointerEvents: 'none' }}
    />
  )
}

