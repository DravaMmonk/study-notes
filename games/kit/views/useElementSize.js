import { useLayoutEffect, useState } from 'react'

/** Measure an element's inner dimensions or, for artwork scaled in CSS pixels, its content box. */
export function useElementSize(ref, box = 'client') {
  const [size, setSize] = useState(null)
  useLayoutEffect(() => {
    const element = ref.current
    if (!element) return undefined
    const update = (width, height) => setSize((old) => old?.width === width && old.height === height ? old : { width, height })
    const measure = () => update(element.clientWidth, element.clientHeight)
    const observer = new ResizeObserver(([{ contentRect }]) => {
      if (box === 'content') update(contentRect.width, contentRect.height)
      else measure()
    })
    if (box === 'client') measure()
    observer.observe(element)
    return () => observer.disconnect()
  }, [ref, box])
  return size
}
