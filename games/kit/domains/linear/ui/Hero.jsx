import { useEffect, useRef } from 'react'
import { mountShear } from '../../../../shear/shear.js'

// The map's illustration: a shear rack on a turntable, its rows of the grid pushed aslant by a leaning fence and turned
// round (games/shear, a 3D figure from the anatomy kit).
export default function Hero() {
  const box = useRef(null)
  useEffect(() => mountShear(box.current), [])
  return <figure className="hero-fig"><div ref={box} /></figure>
}
