import { familyOf } from '../catalog.js'

// Ports and wires of the phone board.

export const PORT_TAGS = { a: 'a', b: 'b', left: '左', right: '右', c0: 'd0', c1: 'd1', c2: 'd2', c3: 'd3' }

// Port ids: a block's output is `out:<id>`, an input is `in:<id>:<port>`.
export const outPort = (id) => `out:${id}`
export const inPort = (id, port) => `in:${id}:${port}`
export const parsePort = (p) => {
  const [side, id, port] = p.split(':')
  return side === 'out' ? { side, id } : { side, id, port }
}

// Wires from each output dot down (or round) to the input dot it feeds, coloured by the source's
// family; `live` is a wire being dragged from a dot to the finger.
export function drawWires(el, graph, live) {
  const svg = el.querySelector('.pb-wires')
  if (!svg) return
  const origin = el.getBoundingClientRect()
  const at = (p) => {
    const dot = el.querySelector(`[data-p="${CSS.escape(p)}"]`)
    if (!dot) return null
    const box = dot.getBoundingClientRect()
    return [box.left + box.width / 2 - origin.left, box.top + box.height / 2 - origin.top]
  }
  const curve = ([ax, ay], [bx, by]) => {
    const drop = Math.max(28, Math.abs(by - ay) / 2)
    // A wire that has to climb loops out sideways instead of cutting through the blocks.
    const side = by < ay + 10 ? (bx >= ax ? 1 : -1) * 70 : 0
    return `M${ax.toFixed(1)},${ay.toFixed(1)} C${(ax + side).toFixed(1)},${(ay + drop).toFixed(1)} ${(bx + side).toFixed(1)},${(by - drop).toFixed(1)} ${bx.toFixed(1)},${by.toFixed(1)}`
  }
  const family = (id) => familyOf(graph.nodes.find((n) => n.id === id)?.type ?? 'input')
  let markup = ''
  for (const w of graph.wires) {
    const a = at(outPort(w.from))
    const b = at(inPort(w.to, w.port))
    if (a && b) markup += `<path class="pb-casing" d="${curve(a, b)}"/><path class="pb-wire" data-family="${family(w.from)}" d="${curve(a, b)}"/>`
  }
  if (live) {
    const a = at(live.from)
    if (a) {
      const b = [live.x - origin.left, live.y - origin.top]
      markup += `<path class="pb-wire is-live" d="${live.from.startsWith('out:') ? curve(a, b) : curve(b, a)}"/>`
    }
  }
  svg.setAttribute('width', el.scrollWidth)
  svg.setAttribute('height', el.scrollHeight)
  svg.innerHTML = markup
}
