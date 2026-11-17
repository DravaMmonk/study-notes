/** A wire's source as [node id, output key | null]. */
export const splitSource = (src) => {
  const s = String(src)
  const k = s.indexOf('#')
  return k < 0 ? [s, null] : [s.slice(0, k), s.slice(k + 1)]
}
export const sourceOf = (id, key) => (key === null || key === undefined ? id : `${id}#${key}`)

export const srcNode = (from) => splitSource(from)[0]
export const srcKey = (from) => splitSource(from)[1]

/** Node dependencies of wires, independent of the source output's name. */
export const wireEdges = (wires) => wires.map((wire) => [srcNode(wire.from), wire.to])
