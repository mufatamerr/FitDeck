import { useCallback, useEffect, useState } from 'react'

import type { Results } from '@mediapipe/holistic'

import { useUiStore } from '../../store/uiStore'
import type { Outfit } from '../../types'
import { CameraLayer } from './CameraLayer'
import { HandDebugOverlay } from './HandDebugOverlay'
import { TryOnControls } from './TryOnControls'
import { useHolistic } from './useHolistic'
import { useHandGestures } from './useHandGestures'

type Props = {
  outfitQueue: Outfit[]
  startIndex?: number
  onClose: () => void
  /** (unused in gesture test mode) */
  onSaveOutfit: (outfit: Outfit) => Promise<void> | void
  onSkipOutfit?: (outfit: Outfit) => void
}

export function TryOnModal({
  outfitQueue,
  startIndex = 0,
  onClose,
  onSkipOutfit,
}: Props) {
  const setVoiceWakeBlocked = useUiStore((s) => s.setVoiceWakeBlocked)

  useEffect(() => {
    setVoiceWakeBlocked(true)
    return () => setVoiceWakeBlocked(false)
  }, [setVoiceWakeBlocked])

  const [video, setVideo] = useState<HTMLVideoElement | null>(null)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [rightHand, setRightHand] = useState<Results['rightHandLandmarks']>(null)
  const [leftHand, setLeftHand] = useState<Results['leftHandLandmarks']>(null)
  const [idx, setIdx] = useState(startIndex)
  const [lastGesture, setLastGesture] = useState<'left' | 'right' | 'fist' | null>(null)
  const [status, setStatus] = useState<'saved' | 'deleted' | 'generating' | null>(null)

  const outfit = outfitQueue[idx]

  const onResults = useCallback((results: Results) => {
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

  const setTransientStatus = useCallback((s: 'saved' | 'deleted' | 'generating') => {
    setStatus(s)
    window.setTimeout(() => setStatus(null), 1100)
  }, [])

  // Pure gesture testing: no real saving/deleting/generating.
  const onGestureLeft = useCallback(() => {
    // Swapped mapping: left swipe behaves like "save".
    setTransientStatus('saved')
    setLastGesture('left')
    // Still advance to keep the test loop feeling real.
    if (outfit) onSkipOutfit?.(outfit)
    next()
  }, [next, onSkipOutfit, outfit, setTransientStatus])

  const onGestureRight = useCallback(() => {
    // Swapped mapping: right swipe behaves like "delete".
    setTransientStatus('deleted')
    setLastGesture('right')
    // Do NOT call onSaveOutfit (test only).
    next()
  }, [next, setTransientStatus])

  const onGestureFist = useCallback(() => {
    setTransientStatus('generating')
    setLastGesture('fist')
    // Nothing else happens in test mode.
  }, [setTransientStatus])

  const { ingest, fistNowRef } = useHandGestures({
    onLeft: onGestureLeft,
    onRight: onGestureRight,
    onFist: onGestureFist,
    mirrorX: true,
  })

  useEffect(() => {
    // Only look at hand landmarks (no pose/body movement fallback).
    const activeHand = rightHand ?? leftHand
    ingest(activeHand)
    // Clear "fist" immediately once the hand opens again.
    if (lastGesture === 'fist' && !fistNowRef.current) {
      setLastGesture(null)
    }
  }, [fistNowRef, ingest, lastGesture, leftHand, rightHand])

  const w = video?.videoWidth || 1280
  const h = video?.videoHeight || 720

  const showFallback = !!cameraError || !!holisticError

  return (
    <div className="fixed inset-0 z-50 bg-black">
      <div className="absolute inset-0">
        {!showFallback ? (
          <>
            {/* Mirror preview so screen-left matches user-left; gestures mirrorX=true to match. */}
            <div className="absolute inset-0 -scale-x-100 transform">
              <CameraLayer onReady={setVideo} onError={setCameraError} />
              <HandDebugOverlay
                width={w}
                height={h}
                handLandmarks={rightHand ?? leftHand}
                lastGesture={lastGesture}
              />
            </div>
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
          onSkip={onGestureLeft}
          onSave={onGestureRight}
        />

        {!holisticReady && !showFallback && (
          <div className="absolute left-1/2 top-4 z-30 -translate-x-1/2 rounded-full bg-black/40 px-3 py-2 text-xs text-zinc-300 backdrop-blur">
            Loading hand model…
          </div>
        )}

        {/* Status label (top-left) */}
        {status && (
          <div className="absolute left-4 top-4 z-40 rounded-full bg-black/55 px-3 py-2 text-xs font-semibold text-white backdrop-blur">
            {status === 'saved' ? 'Saved' : status === 'deleted' ? 'Deleted' : 'Generating'}
          </div>
        )}
      </div>
    </div>
  )
}

