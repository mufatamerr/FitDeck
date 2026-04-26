import type { CSSProperties } from 'react'
import { cn } from '@/lib/utils'

type SuitModelCutoutProps = {
  className?: string
  hovered?: boolean
  imageClassName?: string
  imageStyle?: CSSProperties
}

const suitClipPath =
  'polygon(31% 2%, 39% 2%, 50% 4%, 63% 7%, 71% 16%, 78% 30%, 82% 44%, 83% 51%, 79% 57%, 78% 65%, 76% 74%, 75% 81%, 79% 87%, 80% 95%, 72% 98%, 56% 97%, 54% 90%, 61% 78%, 58% 66%, 50% 56%, 47% 62%, 44% 75%, 37% 88%, 30% 96%, 18% 95%, 4% 89%, 3% 85%, 16% 83%, 24% 74%, 31% 64%, 37% 54%, 30% 47%, 24% 41%, 20% 34%, 18% 27%, 20% 20%, 24% 13%, 29% 7%)'

const cutoutStyle: CSSProperties = {
  clipPath: suitClipPath,
  WebkitClipPath: suitClipPath,
}

export function SuitModelCutout({
  className,
  hovered = false,
  imageClassName,
  imageStyle,
}: SuitModelCutoutProps) {
  return (
    <div className={cn('relative', className)}>
      <img
        src="/model.png"
        alt="Suit model"
        className={cn(
          'absolute inset-0 h-full w-full object-contain object-bottom transition-all duration-500',
          hovered ? 'scale-[1.02] opacity-15' : 'opacity-100',
          imageClassName,
        )}
        style={{
          ...cutoutStyle,
          ...imageStyle,
          filter: hovered
            ? 'brightness(0.82) contrast(1.08) saturate(0.92)'
            : 'brightness(0.96) contrast(1.12) saturate(1.02)',
        }}
      />
      <img
        src="/model.png"
        alt=""
        aria-hidden="true"
        className={cn(
          'absolute inset-0 h-full w-full object-contain object-bottom transition-all duration-500',
          hovered ? 'scale-[1.03] opacity-100' : 'opacity-0',
          imageClassName,
        )}
        style={{
          ...cutoutStyle,
          ...imageStyle,
          filter:
            'brightness(1.04) contrast(1.16) saturate(1.25) hue-rotate(-14deg) drop-shadow(0 24px 40px rgba(0,0,0,0.42))',
        }}
      />
    </div>
  )
}
