import { useEffect, useRef } from 'react'
import { mountEngine } from '../../../../engine/engine.js'

// The map's illustration: a small difference engine counting out the squares (games/engine, a 3D figure from the
// anatomy kit).
export default function Hero() {
  const box = useRef(null)
  useEffect(() => mountEngine(box.current), [])
  return <figure className="hero-fig"><div ref={box} /></figure>
}
