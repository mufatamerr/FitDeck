import { useEffect, useMemo, useRef } from 'react'

import type { NormalizedLandmarkList } from '@mediapipe/holistic'

import type { ClothingItem } from '../../types'

type Props = {
  width: number
  height: number
  poseLandmarks?: NormalizedLandmarkList | null
  items: ClothingItem[]
}

function useImage(url?: string | null) {
  return useMemo(() => {
    if (!url) return null
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.src = url
    return img
  }, [url])
}

export function AROverlay({ width, height, poseLandmarks, items }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  const shirt = items.find((i) => i.category === 'shirt')
  const jacket = items.find((i) => i.category === 'jacket')
  const pants = items.find((i) => i.category === 'pants')
  const shoes = items.find((i) => i.category === 'shoes')

  const shirtImg = useImage(shirt?.try_on_asset || shirt?.image_url)
  const jacketImg = useImage(jacket?.try_on_asset || jacket?.image_url)
  const pantsImg = useImage(pants?.try_on_asset || pants?.image_url)
  const shoesImg = useImage(shoes?.try_on_asset || shoes?.image_url)

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

    ctx.clearRect(0, 0, canvas.width, canvas.height)
    if (!poseLandmarks || poseLandmarks.length < 29) return

    const px = (lm: { x: number; y: number }) => ({ x: lm.x * width, y: lm.y * height })
    const ls = px(poseLandmarks[11]) // left shoulder
    const rs = px(poseLandmarks[12]) // right shoulder
    const lh = px(poseLandmarks[23]) // left hip
    const rh = px(poseLandmarks[24]) // right hip
    const la = px(poseLandmarks[27]) // left ankle
    const ra = px(poseLandmarks[28]) // right ankle

    const shoulderW = Math.abs(ls.x - rs.x)
    const hipY = (lh.y + rh.y) / 2
    const torsoH = Math.abs(hipY - rs.y)
    const ankleY = (la.y + ra.y) / 2
    const legH = Math.abs(ankleY - hipY)

    const draw = (img: HTMLImageElement | null, x: number, y: number, w: number, h: number) => {
      if (!img) return
      if (!img.complete) return
      ctx.drawImage(img, x, y, w, h)
    }

    // shirt
    draw(
      shirtImg,
      Math.min(rs.x, ls.x) - shoulderW * 0.2,
      rs.y - torsoH * 0.1,
      shoulderW * 1.4,
      torsoH * 1.05,
    )
    // jacket on top
    draw(
      jacketImg,
      Math.min(rs.x, ls.x) - shoulderW * 0.3,
      rs.y - torsoH * 0.12,
      shoulderW * 1.6,
      torsoH * 1.12,
    )
    // pants
    draw(
      pantsImg,
      Math.min(lh.x, rh.x) - shoulderW * 0.15,
      hipY,
      shoulderW * 1.3,
      legH * 1.05,
    )
    // shoes near ankles
    draw(
      shoesImg,
      Math.min(la.x, ra.x) - shoulderW * 0.2,
      Math.max(la.y, ra.y) - shoulderW * 0.1,
      shoulderW * 1.4,
      shoulderW * 0.6,
    )
  }, [height, jacketImg, pantsImg, poseLandmarks, shirtImg, shoesImg, width])

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 z-10 h-full w-full"
      style={{ pointerEvents: 'none' }}
    />
  )
}

