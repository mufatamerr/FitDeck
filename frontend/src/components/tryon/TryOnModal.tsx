import { useCallback, useEffect, useState } from 'react'

import type { Results } from '@mediapipe/holistic'

import { useUiStore } from '../../store/uiStore'
import type { Outfit } from '../../types'
import { AROverlay } from './AROverlay'
import { CameraLayer } from './CameraLayer'
import { HandDebugOverlay } from './HandDebugOverlay'
import { TryOnControls } from './TryOnControls'
import { useHolistic } from './useHolistic'
import { useSwipeGesture } from './useSwipeGesture'

type Props = {
  outfitQueue: Outfit[]
  startIndex?: number
  onClose: () => void
  onSaveOutfit: (outfit: Outfit) => Promise<void> | void
  onSkipOutfit?: (outfit: Outfit) => void
}

export function TryOnModal({
  outfitQueue,
  startIndex = 0,
  onClose,
  onSaveOutfit,
  onSkipOutfit,
}: Props) {
  const setVoiceWakeBlocked = useUiStore((s) => s.setVoiceWakeBlocked)

  useEffect(() => {
    setVoiceWakeBlocked(true)
    return () => setVoiceWakeBlocked(false)
  }, [setVoiceWakeBlocked])

  const [video, setVideo] = useState<HTMLVideoElement | null>(null)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [pose, setPose] = useState<Results['poseLandmarks']>(null)
  const [rightHand, setRightHand] = useState<Results['rightHandLandmarks']>(null)
  const [leftHand, setLeftHand] = useState<Results['leftHandLandmarks']>(null)
  const [idx, setIdx] = useState(startIndex)
  const [saving, setSaving] = useState(false)
  const [lastGesture, setLastGesture] = useState<'left' | 'right' | null>(null)

  const outfit = outfitQueue[idx]

  const onResults = useCallback((results: Results) => {
    setPose(results.poseLandmarks ?? null)
    setRightHand(results.rightHandLandmarks ?? null)
    setLeftHand(results.leftHandLandmarks ?? null)
  }, [])

  const { ready: holisticReady, error: holisticError } = useHolistic({
    video,
    onResults,
  })

  const next = useCallback(() => {
    setIdx((i) => Math.min(i + 1, outfitQueue.length - 1))
  }, [outfitQueue.length])

  const skip = useCallback(() => {
    if (outfit) onSkipOutfit?.(outfit)
    next()
  }, [next, onSkipOutfit, outfit])

  const save = useCallback(async () => {
    if (!outfit || saving) return
    setSaving(true)
    try {
      await onSaveOutfit(outfit)
      next()
    } finally {
      setSaving(false)
    }
  }, [next, onSaveOutfit, outfit, saving])

  const { ingest, lastGestureRef } = useSwipeGesture(skip, () => void save())

  useEffect(() => {
    // Many users naturally swipe with their left hand; accept either.
    const activeHand = rightHand ?? leftHand
    const poseWristX = pose?.[16]?.x ?? pose?.[15]?.x ?? null // right wrist, else left wrist
    ingest(activeHand, poseWristX)
    if (lastGestureRef.current && lastGestureRef.current !== lastGesture) {
      setLastGesture(lastGestureRef.current)
      const t = setTimeout(() => setLastGesture(null), 500)
      return () => clearTimeout(t)
    }
  }, [ingest, lastGesture, lastGestureRef, leftHand, pose, rightHand])

  const w = video?.videoWidth || 1280
  const h = video?.videoHeight || 720

  const showFallback = !!cameraError || !!holisticError

  return (
    <div className="fixed inset-0 z-50 bg-black">
      <div className="absolute inset-0">
        {!showFallback ? (
          <>
            <CameraLayer onReady={setVideo} onError={setCameraError} />
            <AROverlay width={w} height={h} poseLandmarks={pose} items={outfit?.items ?? []} />
            <HandDebugOverlay
              width={w}
              height={h}
              handLandmarks={rightHand ?? leftHand}
              poseWrist={pose?.[16] ?? pose?.[15] ?? null}
              lastGesture={lastGesture}
            />
          </>
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-black text-center text-sm text-zinc-300">
            <div className="max-w-md px-6">
              <p className="text-white">Try-On is unavailable</p>
              <p className="mt-2 text-zinc-400">
                {cameraError || holisticError || 'Camera / MediaPipe failed to load.'}
              </p>
              <p className="mt-4 text-zinc-500">
                You can still use the touch controls below.
              </p>
            </div>
          </div>
        )}

        <TryOnControls
          outfitName={outfit?.name}
          index={idx}
          total={outfitQueue.length}
          onClose={onClose}
          onSkip={skip}
          onSave={() => void save()}
        />

        {!holisticReady && !showFallback && (
          <div className="absolute left-1/2 top-4 z-30 -translate-x-1/2 rounded-full bg-black/40 px-3 py-2 text-xs text-zinc-300 backdrop-blur">
            Loading pose model…
          </div>
        )}

        {saving && (
          <div className="absolute left-1/2 top-14 z-30 -translate-x-1/2 rounded-full bg-violet-600/90 px-3 py-2 text-xs text-white">
            Saving…
          </div>
        )}
      </div>
    </div>
  )
}

