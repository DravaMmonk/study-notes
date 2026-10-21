import { useEffect, useRef } from 'react'
import { mountStick } from '../../../../stick/stick.js'

// The map's illustration: the composing stick (games/stick, a figure from the anatomy kit) setting one sentence.
export default function Hero() {
  const box = useRef(null)
  useEffect(() => mountStick(box.current), [])
  return <figure className="hero-fig"><div ref={box} /></figure>
}
