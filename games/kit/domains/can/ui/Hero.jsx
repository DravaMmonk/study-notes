import { useEffect, useRef } from 'react'
import { mountWave } from '../../../../wave/wave.js'

// The map's illustration: controllers on one bus (games/wave).
export default function Hero() {
  const box = useRef(null)
  useEffect(() => mountWave(box.current), [])
  return <figure className="hero-fig"><div ref={box} /></figure>
}
