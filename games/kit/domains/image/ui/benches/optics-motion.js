import { useEffect, useRef, useState } from 'react'

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

// Ease a list of numbers toward new targets (cubic ease-out, ~ms) so a drawing glides between the
// steps of a control instead of jumping. While `instant` is set (a drag in progress) or the reader
// prefers reduced motion, the numbers follow their targets at once.
export function useTween(values, { ms = 260, instant = false } = {}) {
  const key = values.join(',')
  const [shown, setShown] = useState(values)
  const current = useRef(values)

  useEffect(() => {
    const goal = key.split(',').map(Number)
    const from = current.current
    const still = instant || reducedMotion() || from.length !== goal.length
    const start = performance.now()
    let frame = 0
    const step = (now) => {
      const t = still ? 1 : Math.min(1, (now - start) / ms)
      const eased = 1 - (1 - t) ** 3
      const next = goal.map((g, i) => from[i] + (g - from[i]) * eased)
      current.current = next
      setShown(next)
      if (t < 1) frame = requestAnimationFrame(step)
    }
    frame = requestAnimationFrame(step)
    return () => cancelAnimationFrame(frame)
  }, [key, ms, instant])

  return instant ? values : shown
}
