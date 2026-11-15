import { useEffect, useReducer, useRef } from 'react'
import { paceOf } from '../engine/trace.js'
import { useSetting } from './useSetting.js'
import { reduced } from './useBoardInteraction.jsx'

/**
 * A run the player can skip, pause and step through, one per screen. Waits resolve at once while skipping or with
 * reduced motion; while paused a wait holds until the player steps or goes on. The screen redraws whenever the run
 * starts, ends, pauses or goes on; leaving the screen skips what is left (`alive` turns false, so a run stops there).
 */
export function usePacedRun() {
  const [speed] = useSetting('playbackSpeed')
  const [, redraw] = useReducer((n) => n + 1, 0)
  const player = useRef(null)
  if (!player.current) {
    const p = {
      running: false, skipping: false, paused: false, alive: true, wake: null,
      pace(test, steps) { return paceOf(test, steps, p.speed) },
      end() { p.running = false; redraw() },
      skip() { Object.assign(p, { skipping: true, paused: false }); redraw(); p.wake?.() },
      pause() { p.paused = true; redraw() },
      resume() { p.paused = false; redraw(); p.wake?.() },
      /** One step on while paused. */
      step() { p.wake?.() },
      wait(ms) {
        if (p.skipping) return Promise.resolve()
        if (p.paused) return new Promise((res) => { p.wake = () => { p.wake = null; res() } })
        if (reduced()) return Promise.resolve()
        return new Promise((res) => {
          const t = setTimeout(() => { p.wake = null; res() }, ms)
          p.wake = () => { clearTimeout(t); p.wake = null; res() }
        })
      },
    }
    player.current = p
  }
  const p = player.current
  p.begin = (paused = false) => { Object.assign(p, { running: true, skipping: false, paused, speed }); redraw() }
  useEffect(() => {
    p.alive = true
    return () => {
      p.alive = false
      if (p.running) p.skip()
    }
  }, [p])
  return p
}
