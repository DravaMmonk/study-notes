import { useLayoutEffect, useRef, useState } from 'react'
import { REDUCED_MOTION, useMedia } from '../shell/useMedia.js'

const linear = (from, to, progress) => from + (to - from) * progress

/** Ease a numeric vector from its current position. Keep the target reference stable while its values are unchanged. */
export function useTween(target, { ms = 260, instant = false, interpolate = linear } = {}) {
  const reduced = useMedia(REDUCED_MOTION)
  const immediate = reduced || instant || ms <= 0
  const [shown, setShown] = useState(target)
  const current = useRef(target)

  useLayoutEffect(() => {
    const from = current.current
    if (immediate || from.length !== target.length) {
      current.current = target
      setShown(target)
      return undefined
    }
    if (target.every((value, i) => Object.is(value, from[i]))) return undefined

    const start = performance.now()
    let frame
    const tick = (now) => {
      const t = Math.min(1, (now - start) / ms)
      const eased = 1 - (1 - t) ** 3
      const next = t === 1 ? target : target.map((value, i) => interpolate(from[i], value, eased))
      current.current = next
      setShown(next)
      if (t < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [target, immediate, interpolate, ms])

  return immediate || target.length !== shown.length ? target : shown
}
