import { useEffect, useRef } from 'react'
import { tr } from '../../kit/shell/i18n.js'
import { routeSteps } from './algo.js'
import { gridScene, sceneSVG } from './svg.js'
import { reduced, sleep } from './util.js'

// The map's illustration: route counts flowing along the arrows of a 3×5 grid, from the top left to the bottom right.
export default function Hero() {
  const box = useRef(null)
  useEffect(() => {
    const R = 3, C = 5, steps = routeSteps(R, C, 'colL')
    let alive = true
    const draw = (k) => {
      const shown = new Map(steps.slice(0, k).map((s) => [s.id, s.v]))
      const now = steps[k - 1], live = now && k < steps.length
      const scene = gridScene(R, C, {
        cell: (r, c) => { const id = `${r},${c}`; return { value: shown.has(id) ? shown.get(id) : '', cls: live && now.id === id ? 'hot' : shown.has(id) ? 'lit' : '' } },
        edge: (a, b) => (live && now.id === b ? 'hot' : 'dim'),
      })
      if (box.current) box.current.innerHTML = sceneSVG(scene, { pad: 8, label: tr('路线数随着箭头从左上流到右下', 'Route counts flowing along the arrows from the top left to the bottom right') })
    }
    if (reduced()) draw(steps.length)
    else {
      ;(async () => {
        while (alive) {
          for (let k = 0; k <= steps.length && alive; k++) { draw(k); await sleep(k === 0 ? 600 : 330) }
          await sleep(3200)
        }
      })()
    }
    return () => { alive = false }
  }, [])
  return <figure className="hero-fig"><div ref={box} /></figure>
}
