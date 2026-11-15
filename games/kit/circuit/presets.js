import { srcNode } from '../engine/wire-source.js'
import { cardPosition } from './layout.js'
import { frameTree } from './regions.js'

/** The preset a level takes from its reference `answer`: the cards `items` (an id, or { id, fixed } to fix its
 *  settings: true, or a list of keys), their enclosing frames, and the answer's wires among them and the board's own
 *  inputs and outputs (`own`). */
export function presetOf(answer, items, own = new Set()) {
  const fixed = new Map(items.map((item) => (typeof item === 'string' ? [item, undefined] : [item.id, item.fixed])))
  const picked = presetCardIds(answer, fixed.keys())
  const on = (id) => picked.has(id) || own.has(id)
  return {
    nodes: answer.nodes.filter((n) => picked.has(n.id)).map((n) => (fixed.get(n.id) ? { ...n, fixed: fixed.get(n.id) } : n)),
    wires: answer.wires.filter((w) => on(srcNode(w.from)) && on(w.to) && (picked.has(srcNode(w.from)) || picked.has(w.to))),
  }
}

/** The containing frames are part of the preset whenever a card within them is preset. */
export const presetCardIds = (answer, ids) => frameTree(answer.nodes).withParents(ids)

/** A level's protected cards also include the ends of locked wires and every frame containing them. */
export function lockedCards(graph) {
  const ids = graph.nodes.filter((node) => node.locked).map((node) => node.id)
  for (const wire of graph.wires) {
    if (wire.locked) ids.push(srcNode(wire.from), wire.to)
  }
  return ids.length ? frameTree(graph.nodes).withParents(ids) : new Set()
}

export const PRESET_CARD_REFUSAL = {
  zh: '关卡锁住了这个元件或它里面的内容。',
  en: 'The level locks this part or something it contains.',
}
export const leavesLockedRegion = (ids, node, region) => Boolean(node && ids.has(node.id) && (node.in ?? null) !== region)

/** A level's preset, locked, at the positions on the board and with only the unfixed settings editable. */
export function withPreset(graph, preset) {
  if (!preset) return graph
  return overlay(graph, preset.nodes.map((node) => ({ ...node, locked: true })), preset.wires.map((wire) => ({ ...wire, locked: true })))
}

function overlay(graph, cards, wires) {
  const had = new Map(graph.nodes.map((n) => [n.id, n]))
  const restored = new Map(cards.map((node) => {
    const at = had.get(node.id)
    const params = keepFixedSettings(node, at && at.type === node.type ? at.params ?? node.params : node.params)
    return [node.id, { ...node, ...cardPosition(at), ...(params && { params }) }]
  }))
  const nodes = graph.nodes.map((node) => restored.get(node.id) ?? node)
  for (const [id, node] of restored) if (!had.has(id)) nodes.push(node)
  const filled = new Set(wires.map((w) => `${w.to}|${w.port}`))
  return {
    ...graph,
    nodes,
    wires: [...graph.wires.filter((w) => !w.locked && !filled.has(`${w.to}|${w.port}`)), ...wires],
  }
}

/** Preserve the locked wires, their cards and their enclosing frames when replacing a board. */
export function keepLocked(prev, next) {
  const ids = lockedCards(prev)
  if (!ids.size) return next
  return overlay(next, prev.nodes.filter((node) => ids.has(node.id)), prev.wires.filter((wire) => wire.locked))
}

const LOCKED = { zh: '这根线是关卡接好的，不能改。', en: 'This wire came with the level; it cannot be changed.' }
/** Why the wire into input `port` of `to` cannot be changed: a locked wire is there. */
export const lockedRefusal = (graph, to, port) => (graph.wires.some((w) => w.locked && w.to === to && w.port === port) ? LOCKED : null)
/** Whether a setting of a node is one the level fixed. */
export const isFixed = (node, key) => node.fixed === true || (Array.isArray(node.fixed) && node.fixed.includes(key))
/** Copy proposed settings while preserving the preset's values, including unset fields. */
export function keepFixedSettings(node, params) {
  if (node.fixed === true) return node.params
  if (!node.fixed?.length) return params
  const next = { ...params }
  for (const key of node.fixed) {
    if (node.params && Object.prototype.hasOwnProperty.call(node.params, key)) next[key] = node.params[key]
    else delete next[key]
  }
  return next
}

export const PRESET_PORT_REFUSAL = {
  zh: '这个设置会断开关卡接好的线。',
  en: 'This setting would disconnect a wire placed by the level.',
}

