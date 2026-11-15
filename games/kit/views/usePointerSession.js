import { useLayoutEffect, useRef } from 'react'
import { trackPointer } from '../pointer.js'

/** A view owns one gesture and cancels it when replaced or unmounted. */
export function usePointerSession() {
  const active = useRef(null)
  const cancel = () => active.current?.()
  useLayoutEffect(() => () => active.current?.(), [])
  const track = (event, { move, finish, escape, capture = false }) => {
    cancel()
    active.current = trackPointer(event.pointerId, {
      move, escape, capture: capture ? event.currentTarget : undefined,
      finish(commit, release) {
        active.current = null
        finish?.(commit, release)
      },
    }) ?? null
  }
  return { track, cancel }
}
