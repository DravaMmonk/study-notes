import { useEffect, useRef } from 'react'
import { mountShear } from '../../../../shear/shear.js'

// The map's illustration: the plane's grid pushed aslant and back (games/shear).
export default function Hero() {
  const box = useRef(null)
  useEffect(() => mountShear(box.current), [])
  return <figure className="hero-fig"><div ref={box} /></figure>
}
