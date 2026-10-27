import { useEffect, useRef } from 'react'
import { mountLoop } from '../../../../loop/loop.js'

// The map's illustration: the agent loop (games/loop).
export default function Hero() {
  const box = useRef(null)
  useEffect(() => mountLoop(box.current), [])
  return <figure className="hero-fig"><div ref={box} /></figure>
}
