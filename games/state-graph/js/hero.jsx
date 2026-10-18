import { useEffect, useRef } from 'react'
import { mountBoxy } from '../../boxy/boxy.js'

// The map's illustration: Boxy on the middle cell of its 3×3 view, reading the cell above and the cell to its left
// (games/boxy, a 3D figure from the anatomy kit).
export default function Hero() {
  const box = useRef(null)
  useEffect(() => mountBoxy(box.current), [])
  return <figure className="hero-fig"><div ref={box} /></figure>
}
