import { useSyncExternalStore } from 'react'

// Subscribe to a CSS media query, e.g. useMedia('(max-width: 760px)').
export function useMedia(query) {
  return useSyncExternalStore(
    (notify) => {
      const list = window.matchMedia(query)
      list.addEventListener('change', notify)
      return () => list.removeEventListener('change', notify)
    },
    () => window.matchMedia(query).matches,
    () => false,
  )
}

export const reduced = () => typeof window !== 'undefined' && Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)

export const PHONE = '(max-width: 760px)'
