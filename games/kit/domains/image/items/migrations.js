// The save migrations content names (vocabulary.js migration): game.json's saves write { data: item } where the
// shared migrations (../../../shell/saves.js) take a function of every level's kept state; this resolves each item
// into that function. A circuit level keeps its board (engine/board.js), and the board it passed with (`passed`).
import { callOf } from '../../../engine/schema.js'

const t = (zh, en) => ({ zh, en })

// Boards before version 15 spelt Shift's directions as arrows and the reparameterisation's ports in Greek.
const ARROWS = { '→': 'right', '←': 'left', '↓': 'down', '↑': 'up' }
const GREEK = { μ: 'mu', σ: 'sigma', ε: 'eps' }
const asciiCircuit = (c) => ({
  ...c,
  nodes: c.nodes.map((n) => (n.type === 'shift' && n.params?.dir in ARROWS ? { ...n, params: { ...n.params, dir: ARROWS[n.params.dir] } } : n)),
  wires: c.wires.map((w) => (w.port in GREEK ? { ...w, port: GREEK[w.port] } : w)),
})

export const MIGRATIONS = {
  ascii: {
    about: t('电路板的设置和口名都换成 ASCII：平移的方向写名字，重参数化的口写 mu、sigma、eps', 'every key of a board in ASCII: Shift’s directions by name, the reparameterisation’s ports as mu, sigma, eps'),
    make: () => (board) => (board?.nodes ? { ...asciiCircuit(board), ...(board.passed && { passed: asciiCircuit(board.passed) }) } : board),
  },
}

/** A migration item as the function the shared migrations run on every level's state. */
export function migration(call) {
  const [name, params] = callOf(call)
  return MIGRATIONS[name].make(params)
}

/** game.json's saves with every { data: item } a function. */
export const savesOf = (saves) => saves.map((step) => ({ ...step, ops: step.ops.map((op) => ('data' in op ? { data: migration(op.data) } : op)) }))
