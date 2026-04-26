'use client'

import type { ReactNode } from 'react'

import { Card } from '@/components/ui/card'
import { ContainerScroll } from '@/components/ui/container-scroll-animation'
import { SplineScene } from '@/components/ui/splite'
import { Spotlight } from '@/components/ui/spotlight'

export function SplineSceneBasic() {
  return (
    <Card className="relative h-[500px] w-full overflow-hidden border-white/10 bg-black/[0.9]">
      <Spotlight
        className="-top-40 left-0 md:left-60 md:-top-20"
        fill="white"
      />

      <div className="flex h-full">
        <div className="relative z-10 flex flex-1 flex-col justify-center p-8">
          <p className="text-[10px] uppercase tracking-[0.3em] text-neutral-500">
            FitDeck
          </p>
          <h1 className="mt-3 bg-gradient-to-b from-neutral-50 to-neutral-400 bg-clip-text text-4xl font-bold text-transparent md:text-5xl">
            Runway access.
          </h1>
        </div>

        <div className="relative flex-1 overflow-hidden">
          <SplineScene
            scene="https://prod.spline.design/kZDDjO5HuC9GJUM2/scene.splinecode"
            className="h-full w-full"
          />
        </div>
      </div>
    </Card>
  )
}

type HeroScrollDemoProps = {
  titleComponent: ReactNode
  videoSrc: string
  primaryAction?: ReactNode
  secondaryAction?: ReactNode
  meta?: Array<{ label: string; value: string }>
}

export function HeroScrollDemo({
  titleComponent,
  videoSrc,
  primaryAction,
  secondaryAction,
  meta = [],
}: HeroScrollDemoProps) {
  return (
    <div className="flex flex-col overflow-hidden pb-24 pt-8 md:pb-32 md:pt-12">
      <ContainerScroll titleComponent={titleComponent}>
        <div className="relative h-full w-full bg-[#090909]">
          <video
            autoPlay
            loop
            muted
            playsInline
            src={videoSrc}
            className="mx-auto h-full w-full object-cover object-center"
            draggable={false}
            style={{
              filter: 'grayscale(1) sepia(0.08) contrast(1.02) brightness(1.02) saturate(0.12)',
            }}
          />

          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.02),rgba(0,0,0,0.18)),radial-gradient(ellipse_70%_70%_at_50%_40%,transparent_28%,rgba(0,0,0,0.32)_100%)]" />

          {(primaryAction || secondaryAction || meta.length) ? (
            <div className="absolute inset-x-5 bottom-5 z-10 flex flex-col gap-5 md:inset-x-8 md:bottom-7 md:flex-row md:items-end md:justify-between">
              <div className="flex flex-wrap gap-3">
                {primaryAction}
                {secondaryAction}
              </div>

              {meta.length ? (
                <div className="flex flex-wrap gap-x-8 gap-y-3 md:justify-end">
                  {meta.map((item) => (
                    <div key={item.label}>
                      <p className="m-0 text-[9px] tracking-[0.24em] text-[#d7d0c7]">
                        {item.label}
                      </p>
                      <p className="mt-2 text-xs tracking-[0.05em] text-[#f5efe7]">
                        {item.value}
                      </p>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </ContainerScroll>
    </div>
  )
}
