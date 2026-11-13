import { useLayoutEffect, useState } from 'react'

export function useBoardWidth(ref) {
  const [width, setWidth] = useState(Infinity)
  useLayoutEffect(() => {
    const element = ref.current
    if (!element) return undefined
    const measure = () => setWidth(element.clientWidth || Infinity)
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    measure()
    return () => observer.disconnect()
  }, [ref])
  return width
}
