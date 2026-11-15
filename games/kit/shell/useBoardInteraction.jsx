import { useEffect, useMemo, useRef, useState } from 'react'
import { Markup } from './Markup.jsx'

export const buzz = (pattern) => {
  try {
    if (navigator.vibrate) navigator.vibrate(pattern)
  } catch {
    // No haptics here.
  }
}

/** A message that shows at the top of the page for a moment: [show(msg), the element to put on the page]. */
export function useToast() {
  const [msg, setMsg] = useState(null)
  const [shown, setShown] = useState(false)
  const timer = useRef(0)
  useEffect(() => () => clearTimeout(timer.current), [])
  const show = (text) => {
    setMsg(text)
    setShown(true)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setShown(false), 2400)
  }
  // A message may name a part (<part-ref>), drawn by the shell as a link.
  return [show, <div key="toast" className={`toast ${shown ? 'show' : ''}`} role="status"><Markup text={String(msg ?? '')} /></div>]
}

/**
 * Passing and failing, through the shell: pass() solves the level, fail(info) opens the shell's fail dialog
 * ({ head, body, extra?, hint?, cta? }; without a hint of its own, the level's first). `fails` counts this visit's.
 */
export function useVerdict({ hints, solve, fail }) {
  const shell = useRef(null)
  shell.current = { solve, fail, hints }
  const fails = useRef(0)
  return useMemo(() => ({
    fails,
    pass() {
      buzz([15, 40, 15, 40, 60])
      shell.current.solve(null)
    },
    fail(x) {
      fails.current++
      buzz([30, 60, 30])
      shell.current.fail({ ...x, hint: x.hint !== undefined ? x.hint : shell.current.hints?.[0] ?? null })
    },
  }), [])
}

/** A timer that does nothing once the screen is gone. */
export function useLater() {
  const alive = useRef(true)
  useEffect(() => {
    alive.current = true
    return () => { alive.current = false }
  }, [])
  return (fn, ms) => setTimeout(() => alive.current && fn(), ms)
}

/** Digits, Backspace and Enter typed into the cell a keypad is open on (`key` as the keypad's own keys). */
export const typing = (event, key) => {
  // A key a board cell took (Enter on it picks it) is not typed as well.
  if (event.defaultPrevented || event.target.closest('button,input')) return
  if (/^[0-9]$/.test(event.key)) key(event.key)
  else if (event.key === 'Backspace') key('del')
  else if (event.key === 'Enter') key('ok')
}
