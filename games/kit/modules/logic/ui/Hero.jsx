import { useEffect, useRef } from 'react'
import { mountDetach } from '../../../../detach/detach.js'

// The map's illustration: the Detach press (games/detach, a figure from the anatomy kit) proving B from A → B and A.
export default function Hero() {
  const box = useRef(null)
  useEffect(() => mountDetach(box.current), [])
  return <figure className="hero-fig"><div ref={box} /></figure>
}
