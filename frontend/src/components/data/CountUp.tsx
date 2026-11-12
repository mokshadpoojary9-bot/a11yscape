import { useEffect, useRef, useState } from 'react'
import { formatNumber } from '@/lib/format'
import { useSettings } from '@/hooks/useSettings'

interface CountUpProps {
  value: number | null | undefined
  durationMs?: number
  className?: string
}

/**
 * Animates a measured value on mount. It never invents a value: when no
 * measurement is available it renders an em dash. Reduced-motion users see
 * the final number immediately.
 */
export function CountUp({ value, durationMs = 900, className }: CountUpProps) {
  const { settings } = useSettings()
  const [display, setDisplay] = useState(value ?? 0)
  const previous = useRef(value ?? 0)

  useEffect(() => {
    if (value === null || value === undefined) return
    if (settings.reduceMotion || durationMs <= 0) {
      setDisplay(value)
      previous.current = value
      return
    }

    const from = previous.current
    const to = value
    const startedAt = performance.now()
    let frame = 0

    const tick = (now: number) => {
      const progress = Math.min(1, (now - startedAt) / durationMs)
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplay(Math.round(from + (to - from) * eased))
      if (progress < 1) {
        frame = requestAnimationFrame(tick)
      } else {
        previous.current = to
      }
    }

    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [value, durationMs, settings.reduceMotion])

  if (value === null || value === undefined) {
    return <span className={className}>—</span>
  }

  return <span className={className}>{formatNumber(display)}</span>
}
