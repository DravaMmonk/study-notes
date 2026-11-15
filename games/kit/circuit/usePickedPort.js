import { useEffect, useState } from 'react'
import { hasPort } from './model.js'

/** A wire in hand is only active while its port still exists on the board. */
export function usePickedPort(graph, parts) {
  const [picked, setPicked] = useState(null)
  const port = picked && hasPort(graph, parts, picked) ? picked : null
  useEffect(() => {
    if (picked && !port) setPicked(null)
  }, [picked, port])
  return [port, setPicked]
}
