// Mutants of a board: the small mechanical mistakes a test should tell from the answer (games/DIRECTION.md, decision
// 15). A mutant the tests pass is either a board they fail to rule out or another right answer; which, a reader
// decides. Every operator works on any board of the circuit editor ({ nodes, wires }, ./circuit.js) through its
// parts registry, knowing no domain:
//
//   drop      a part taken off, whatever read it reading what its first wired input read
//   swap      two inputs of a part exchanged (never two the part declares symmetric, ./circuit.js: that is the same board)
//   set       one setting moved to another of its options, or a number one step up or down
//   retype    a part replaced by another the task holds with the same ports
//
// Parts fixed on the board (the level's inputs and outputs), frames and what sits in them are left alone.

const idOf = (from) => (from.includes('#') ? from.slice(0, from.indexOf('#')) : from)
const reads = (wire, id) => idOf(wire.from) === id
// A part's ports are a list, or a function of the node (./circuit.js): only lists can be compared between two types.
const portsOf = (part, node) => (typeof part.inputs === 'function' ? part.inputs(node) ?? [] : part.inputs ?? [])
const symmetricOf = (part, node) => (typeof part.symmetric === 'function' ? part.symmetric(node) ?? [] : part.symmetric ?? [])
const listed = (ports) => typeof ports !== 'function'
const same = (a, b) => listed(a) && listed(b) && JSON.stringify(a ?? []) === JSON.stringify(b ?? [])

/**
 * A part's settings as [{ key, options? | control, min?, max?, step? }], from whichever way its registry lists them: a
 * list of settings, the options of each by key (./parts/define.js), or bare keys (`params`), of which those holding a
 * number on this node can step.
 */
function settingsOf(part, node) {
  if (Array.isArray(part.settings)) return part.settings
  const optioned = Object.entries(part.settings ?? {}).map(([key, values]) => ({ key, options: values.map((value) => ({ value })) }))
  const keys = typeof part.params === 'function' ? part.params(node) ?? [] : part.params ?? []
  const stepped = keys.filter((key) => !(key in (part.settings ?? {})) && node.params?.[key] !== '' && Number.isFinite(Number(node.params?.[key] ?? NaN))).map((key) => ({ key, control: 'number', text: typeof node.params[key] === 'string' }))
  return [...optioned, ...stepped]
}

/** The other values a setting can take, by its control (./parts/schema.js): the options, or a step either way. */
function others(setting, value) {
  if (setting.fixed) return []
  if (setting.options) return setting.options.map((o) => o.value).filter((v) => v !== value)
  if (setting.control === 'toggle') return [!value]
  // A number a part keeps as text (a card's typed constant) steps as a number and stays text.
  const n = setting.text ? Number(value) : value
  if (typeof n !== 'number') return []
  const step = setting.step ?? 1
  return [n + step, n - step].map((v) => (setting.text ? String(v) : v)).filter((v) => (setting.min === undefined || Number(v) >= setting.min) && (setting.max === undefined || Number(v) <= setting.max))
}

/**
 * The mutants of `board`: [{ what, board }], `what` a few words naming the change. `partOf(type)` is the registry,
 * `isFixed(type)` says which parts belong to the level, `held` lists the types a retype may put in, `limit` caps how
 * many are made (an even pick in a fixed order, so the same board always gives the same mutants). `declared` gives
 * instead the swaps left out: those between inputs a part declares symmetric, every one of which must pass.
 */
export function mutants(board, { partOf, isFixed = () => false, held = [], limit = 24, declared = false }) {
  const out = []
  const framed = new Set(board.nodes.filter((n) => n.in).flatMap((n) => [n.id, n.in]))
  const own = board.nodes.filter((n) => !isFixed(n.type) && !framed.has(n.id) && !n.locked)
  const wiresInto = (id) => board.wires.filter((w) => w.to === id)
  for (const node of own) {
    const part = partOf(node.type)
    if (!part) continue
    const into = wiresInto(node.id)
    const first = portsOf(part, node).map((port) => into.find((w) => w.port === port)).find(Boolean)
    if (!declared && first && board.wires.some((w) => reads(w, node.id))) {
      out.push({
        what: `drop ${node.id}`,
        board: { ...board, nodes: board.nodes.filter((n) => n !== node), wires: board.wires.filter((w) => w.to !== node.id).map((w) => (reads(w, node.id) ? { ...w, from: first.from } : w)) },
      })
    }
    const alike = symmetricOf(part, node)
    for (let a = 0; a < into.length; a++) {
      for (let b = a + 1; b < into.length; b++) {
        if (into[a].from === into[b].from || (alike.includes(into[a].port) && alike.includes(into[b].port)) !== declared) continue
        out.push({
          what: `swap ${node.id} ${into[a].port}<->${into[b].port}`,
          board: { ...board, wires: board.wires.map((w) => (w === into[a] ? { ...w, from: into[b].from } : w === into[b] ? { ...w, from: into[a].from } : w)) },
        })
      }
    }
    for (const setting of declared ? [] : settingsOf(part, node)) {
      const value = node.params?.[setting.key] ?? part.defaults?.[setting.key] ?? setting.default
      for (const other of others(setting, value)) {
        out.push({ what: `set ${node.id} ${setting.key}=${other}`, board: { ...board, nodes: board.nodes.map((n) => (n === node ? { ...n, params: { ...n.params, [setting.key]: other } } : n)) } })
      }
    }
    for (const type of declared ? [] : held) {
      const other = type === node.type || isFixed(type) ? null : partOf(type)
      if (!other || !same(other.inputs, part.inputs) || !same(other.outputs, part.outputs)) continue
      out.push({ what: `retype ${node.id} ${node.type}->${type}`, board: { ...board, nodes: board.nodes.map((n) => (n === node ? { ...n, type, params: { ...(other.defaults ?? {}) } } : n)) } })
    }
  }
  // Over the limit, an even pick across the whole board rather than its first few parts.
  return out.length <= limit ? out : Array.from({ length: limit }, (_, k) => out[Math.floor((k * out.length) / limit)])
}

/**
 * What the tests make of the mutants: { made, killed, survivors: [what], undeclared: [what] }. `passes(board)` runs a board on the task's
 * tests and hidden tests; a mutant that throws counts as killed.
 */
export function mutationScore(board, passes, options) {
  const all = mutants(board, options)
  const survivors = all.filter((m) => {
    try {
      return passes(m.board)
    } catch {
      return false
    }
  }).map((m) => m.what)
  // A swap between inputs declared symmetric that the tests fail: the declaration is wrong.
  const undeclared = mutants(board, { ...options, declared: true, limit: Infinity }).filter((m) => {
    try {
      return !passes(m.board)
    } catch {
      return true
    }
  }).map((m) => m.what)
  return { made: all.length, killed: all.length - survivors.length, survivors, undeclared }
}
