// A containment address names one region of one frame. The board itself has no address.
export const regionAddress = (frame, region) => `${frame}/${region}`

export function splitRegion(address) {
  if (typeof address !== 'string') return [null, null]
  const split = address.indexOf('/')
  return split > 0 && split < address.length - 1
    ? [address.slice(0, split), address.slice(split + 1)]
    : [null, null]
}

export const frameId = (address) => splitRegion(address)[0]
export const partRegions = (partOf) => (node) => partOf(node.type)?.frames?.(node) ?? []
export const regionsOf = (parts, node) => (node && parts.frames?.(node)) ?? []

/** Whether the editor can still place a card in the chosen region. */
export function isOpenRegion(graph, parts, address) {
  if (!address) return false
  const [id, name] = splitRegion(address)
  const frame = graph.nodes.find((node) => node.id === id)
  return Boolean(frame && !frame.fold && regionsOf(parts, frame).some((region) => region.name === name))
}

/** Index a board's regions for queries in either direction. */
export function frameTree(nodes) {
  const byId = new Map(nodes.map((node) => [node.id, node]))
  const children = new Map()
  for (const node of nodes) {
    const id = frameId(node.in)
    if (id === null) continue
    if (!children.has(id)) children.set(id, [])
    children.get(id).push(node.id)
  }

  // The path to a region is outermost first. Null means the containment goes in a circle.
  const ancestors = (region) => {
    const path = []
    const seen = new Set()
    for (let at = region; at != null;) {
      const id = frameId(at)
      if (seen.has(id)) return null
      seen.add(id)
      path.push(at)
      at = byId.get(id)?.in
    }
    return path.reverse()
  }
  const included = (roots) => {
    const nodes = new Set(roots)
    for (const id of nodes) for (const child of children.get(id) ?? []) nodes.add(child)
    return nodes
  }
  return { node: (id) => byId.get(id), ancestors, included }
}

/** Why a card's region cannot be used, by card id, with one diagnostic per affected card. */
export function regionProblems(graph, parts) {
  if (graph.nodes.every((node) => node.in == null)) return []
  const tree = frameTree(graph.nodes)
  return graph.nodes.flatMap((node) => {
    if (node.in == null) return []
    const [id, name] = splitRegion(node.in)
    if (id === null) return [{ id: node.id, zh: '区域地址无效。', en: 'Invalid frame region address.' }]
    if (!regionsOf(parts, tree.node(id)).some((region) => region.name === name)) {
      return [{ id: node.id, zh: `「${id}」没有叫「${name}」的区域。`, en: `“${id}” has no region called “${name}”.` }]
    }
    if (tree.ancestors(node.in) === null) return [{ id: node.id, zh: '框不能直接或间接放进自己的区域。', en: 'A frame cannot be inside its own region, directly or indirectly.' }]
    return []
  })
}

export const regionsFit = (graph, parts) => !regionProblems(graph, parts).length
