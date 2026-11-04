// One view for every inspected image (ImageInspector): 'info' (numbered cells) or 'overview' (scaled to fit), changed
// by the one switch in the results (ImageViewSwitch). The choice is a per-viewer convenience kept in localStorage.
import { useSyncExternalStore } from 'react'

const KEY = 'vision.imageView'
const read = () => {
  try {
    return localStorage.getItem(KEY) === 'overview' ? 'overview' : 'info'
  } catch {
    return 'info'
  }
}

let view = read()
const listeners = new Set()
const subscribe = (f) => {
  listeners.add(f)
  return () => listeners.delete(f)
}

export const useImageView = () => useSyncExternalStore(subscribe, () => view)

export function setImageView(next) {
  view = next
  try {
    localStorage.setItem(KEY, next)
  } catch { /* the choice lasts this page only */ }
  listeners.forEach((f) => f())
}
