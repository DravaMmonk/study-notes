// The board always connects individual levels.
import { dependencyCycle, dependencyLayers } from '../course.js'

export const linkKey = ({ from, to }) => JSON.stringify([from, to])

export function wiringBoard(levelIds, pins, requires, links) {
  const inside = new Set(levelIds)
  const edges = links.filter(({ from, to }) => inside.has(from) || inside.has(to) || (pins.includes(from) && pins.includes(to)))
  const hosted = new Set([...inside, ...edges.flatMap(({ from, to }) => [from, to]), ...pins])
  const rows = dependencyLayers([...hosted], requires).map((ids) =>
    ids.map((id) => ({ id, portal: !inside.has(id) })))
  return { rows, edges, hosted }
}

export function wiringRefusal(requires, from, to) {
  if (from === to) return 'self'
  const incoming = requires.get(to)
  if (incoming?.includes(from)) return 'duplicate'
  const next = new Map(requires)
  next.set(to, [...(incoming ?? []), from])
  return dependencyCycle(next) ? 'cycle' : null
}

const WIDTH = 180
const PAD = 42
const GAP = 52
const PORT = 44
const HEAD = 40

export function boardGeometry(rows, available, positions = new Map()) {
  const columns = Math.max(1, Math.floor((available - PAD * 2 + GAP) / (WIDTH + GAP)))
  const width = Math.max(WIDTH + PAD * 2, available)
  const cards = [], ports = new Map()
  let y = PAD, bottom = 0
  for (const row of rows) {
    for (let i = 0; i < row.length; i += columns) {
      const band = row.slice(i, i + columns)
      const left = (width - (band.length * WIDTH + (band.length - 1) * GAP)) / 2
      let tallest = 0
      for (const [k, node] of band.entries()) {
        const position = positions.get(node.id)
        const x = position ? Math.min(width - WIDTH - PAD, Math.max(PAD, position.x)) : left + k * (WIDTH + GAP)
        const top = position ? Math.max(PAD, position.y) : y
        const height = (node.portal ? HEAD : 0) + PORT
        cards.push({ ...node, x, y: top, width: WIDTH, height })
        ports.set(node.id, {
          input: { x: x + WIDTH / 2, y: top },
          output: { x: x + WIDTH / 2, y: top + height },
        })
        bottom = Math.max(bottom, top + height)
        tallest = Math.max(tallest, height)
      }
      y += tallest + GAP
    }
  }
  return { cards, ports, width, height: Math.max(120, y - GAP + PAD, bottom + PAD) }
}

export function wireCurve(from, to) {
  const distance = to.y - from.y
  const bend = distance > 0 ? Math.min(90, distance * 0.45) : 48
  return `M${from.x} ${from.y} C${from.x} ${from.y + bend} ${to.x} ${to.y - bend} ${to.x} ${to.y}`
}
