// The budgets a level may set on a circuit (vocabulary.js constraint): a circuit that passes every test can still
// fail one. Each item is check(params) → (score, graph) → '' or what is over, as the shared level runs take a level's
// constraint (../../../engine/tests.js).
import { S, callOf } from '../../../engine/schema.js'
import { order } from '../engine/graph.js'
import { T as t } from '../../../shell/i18n.js'


// The trainable layers a path through a network counts (the deep-network levels need a long one).
const LAYERS = new Set(['lrnConv', 'lrnRes', 'learn3', 'kernel3'])
/** The most trainable layers met on any one path from an input to the output. */
export function depthOf(graph) {
  const byId = new Map(graph.nodes.map((n) => [n.id, n]))
  const depth = new Map()
  for (const id of order(graph)) {
    const before = graph.wires.filter((w) => w.to === id).map((w) => depth.get(w.from) ?? 0)
    depth.set(id, Math.max(0, ...before) + (LAYERS.has(byId.get(id).type) ? 1 : 0))
  }
  return Math.max(0, ...graph.nodes.filter((n) => n.type === 'output').map((n) => depth.get(n.id) ?? 0))
}

/** Whether an input can reach the output without passing an encoder (the autoencoder's bottleneck). */
function bypassesBottleneck(graph) {
  const next = new Map()
  for (const wire of graph.wires) next.set(wire.from, [...(next.get(wire.from) ?? []), wire.to])
  const kind = new Map(graph.nodes.map((n) => [n.id, n.type]))
  const stack = graph.nodes.filter((n) => n.type === 'input').map((n) => n.id)
  const seen = new Set()
  while (stack.length) {
    const id = stack.pop()
    if (seen.has(id)) continue
    seen.add(id)
    if (kind.get(id) === 'output') return true
    if (kind.get(id) === 'dg_encode') continue
    stack.push(...(next.get(id) ?? []))
  }
  return false
}

export const CONSTRAINTS = {
  cost: {
    about: t('计算量不超过 max'),
    params: S.obj({ max: S.num() }),
    check: ({ max }) => (score) => (score.cost > max ? { zh: `计算量 ${score.cost}，超过 ${max}`, en: `Cost ${score.cost}, over ${max}` } : ''),
  },
  nodes: {
    about: t('元件不超过 max 个'),
    params: S.obj({ max: S.int({ min: 1 }) }),
    check: ({ max }) => (score) => (score.nodes > max ? { zh: `用了 ${score.nodes} 个节点，最多 ${max} 个`, en: `${score.nodes} nodes used; at most ${max}` } : ''),
  },
  transforms: {
    about: t('频域的元件（频域低通、频域相乘）一共不超过 max 个'),
    params: S.obj({ max: S.int({ min: 0 }) }),
    check: ({ max }) => (_, graph) => {
      const used = graph.nodes.filter((node) => node.type === 'fqLowpass' || node.type === 'fqApply').length
      return used > max ? { zh: `用了 ${used} 个频域元件，最多 ${max} 个`, en: `${used} frequency-domain parts used, at most ${max}` } : ''
    },
  },
  depth: {
    about: t('最深的一条路上至少 min 个可训练的层'),
    params: S.obj({ min: S.int({ min: 1 }) }),
    check: ({ min }) => (_, graph) => {
      const depth = depthOf(graph)
      return depth < min ? { zh: `最深的一条路上只有 ${depth} 个卷积层，至少要 ${min} 个`, en: `The deepest path has only ${depth} conv ${depth === 1 ? 'layer' : 'layers'}; it needs at least ${min}` } : ''
    },
  },
  bottleneck: {
    about: t('图像要经过编码器，瓶颈不超过 max 个数'),
    params: S.obj({ max: S.int({ min: 1 }) }),
    check: ({ max }) => (_, graph) => {
      if (bypassesBottleneck(graph)) return { zh: '图像没有经过编码器', en: 'The image does not pass through the encoder' }
      const widest = Math.max(0, ...graph.nodes.filter((n) => n.type === 'dg_encode').map((n) => Number(n.params.k ?? 1)))
      return widest > max ? { zh: `瓶颈有 ${widest} 个数，最多 ${max} 个`, en: `The bottleneck has ${widest} numbers; at most ${max} allowed` } : ''
    },
  },
}

/** A level's constraint as the function the level runs call. */
export function constraintOf(call) {
  const [name, params] = callOf(call)
  return CONSTRAINTS[name].check(params)
}
