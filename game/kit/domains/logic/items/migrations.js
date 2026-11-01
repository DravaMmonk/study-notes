// The save migrations content names (vocabulary.js migration, count): game.json's saves write { data: item } and
// { tasks: item } where the shared migrations (../../../shell/saves.js) take a function of every level's kept state
// (or of how many of its tasks are passed); this resolves each item into that function. A level's kept state is its
// board (a proof, a machine, a board of gates: { nodes, wires }), or what another kind of level keeps (a declaration's
// rules, a world, a term…), or, for a level of several tasks, a list of those, one a task.

import { callOf } from '../../../engine/schema.js'
import { boardOf } from '../ruleLines.js'

const isList = Array.isArray
const isBoard = (v) => Boolean(v?.nodes)
/** Every board in a kept state, however deep in its lists, rewritten. */
const boardsDeep = (fix) => {
  const walk = (v) => (isList(v) ? v.map(walk) : isBoard(v) ? fix(v) : v)
  return walk
}

/** One pick of a reshape: what goes in a place of the new state, from the old one (vocabulary.js PICK). */
function pick(p, old) {
  if (p === null) return null
  if (p === 'it') return old
  if (p === 'drop') return undefined
  if (typeof p === 'number') return old?.[p] ?? null
  if (isList(p)) return old?.[p[0]]?.[p[1]] ?? null
  // { at }: the old item as it is, missing too; { at, or }: what `or` picks when it is missing or null.
  return p.or === undefined ? old?.[p.at] : old?.[p.at] ?? pick(p.or, old)
}
/** A reshape's new state: a list of picks (a slice spreading the old one's items), or one pick. */
function picks(ps, old) {
  if (!isList(ps)) return pick(ps, old)
  return ps.flatMap((p) => {
    if (!p || typeof p !== 'object' || isList(p) || !p.slice) return [pick(p, old)]
    const from = p.of === undefined ? old : old?.[p.of]
    const got = from?.slice?.(...p.slice) ?? []
    return got.length || !p.empty ? got : p.empty.map((q) => pick(q, old))
  })
}

// What a board must look like for dropBoards to drop it.
const NUMBER_PARTS = /^(def_|nat_|list_|bool_)|^(addZero|addSucc|addComm|addAssoc|appNil|appAssoc|revApp|succNeq|insLen)$/
const MATCHES = {
  ruleOnCard: (b) => b.nodes.some((n) => ['rule', 'rewrite', 'rewrites'].some((k) => n.params?.[k])),
  numberParts: (b) => b.nodes.some((n) => NUMBER_PARTS.test(n.type)),
  declChain: (b) => b.wires?.some((w) => w.port === 'before') && b.nodes.some((n) => n.id === 'decl'),
  declBoard: (b) => b.nodes.some((n) => n.id === 'decl'),
}

const MIGRATIONS = {
  /** These levels' kept state is dropped: they start afresh. */
  drop: (ids) => (value, id) => (ids.includes(id) ? undefined : value),
  /** A level's tasks changed: its kept state goes where it now belongs. */
  reshape: (levels) => (value, id) => {
    const r = levels[id]
    if (!r) return value
    if ('always' in r) return picks(r.always, value)
    if (isList(value)) return r.list !== undefined && (r.length === undefined || value.length === r.length) ? picks(r.list, value) : value
    if (value === null) return 'null' in r ? picks(r.null, value) : value
    return value && r.one !== undefined ? picks(r.one, value) : value
  },
  /** Parts renamed on every board kept: a type (with these settings) becomes another, keeping all its settings or
   *  those named. */
  retype: (rules) => boardsDeep((b) => ({ ...b, nodes: b.nodes.map((n) => {
    const r = rules.find((x) => x.type === n.type && Object.entries(x.params ?? {}).every(([k, v]) => n.params?.[k] === v))
    return r ? { ...n, type: r.to, ...(r.keep ? { params: Object.fromEntries(r.keep.map((k) => [k, n.params?.[k]])) } : {}) } : n
  }) })),
  /** A setting that held one choice holds a list of them. */
  listParam: ({ key }) => boardsDeep((b) => ({ ...b, nodes: b.nodes.map((n) => (typeof n.params?.[key] === 'string' ? { ...n, params: { ...n.params, [key]: [n.params[key]] } } : n)) })),
  /** Boards of a shape that no longer plays start afresh: one in a list of task boards becomes null, a lone one
   *  `alone` (null, or dropped). */
  dropBoards: ({ match, alone }) => (value) => {
    const old = (b) => isBoard(b) && MATCHES[match](b)
    if (isList(value)) return value.map((b) => (old(b) ? null : b))
    return old(value) ? (alone === 'null' ? null : undefined) : value
  },
  /** The test cases written for a declaration became the work of the shared audit, and the declaration corrected the
   *  first of its boards, on these tasks. */
  auditWork: (levels) => (value, id) => {
    if (!levels[id] || !isList(value)) return value
    const moved = (task) => (task?.cases ? { work: task.cases } : task?.nodes ? { boards: [task] } : task)
    return value.map((task, k) => (levels[id].includes(k) ? moved(task) : task))
  },
  /** A test case written holds what it had as given, the declared sentence its goal, on these tasks. */
  caseGiven: (levels) => (value, id) => {
    if (!levels[id] || !isList(value)) return value
    const moved = (task) => (isList(task?.work) ? { work: task.work.map((c) => (c.have ? { given: c.have, make: c.make } : c)) } : task)
    return value.map((task, k) => (levels[id].includes(k) ? moved(task) : task))
  },
  /** A world built on these levels is the work against the wrong inference on its board. */
  worldWork: (ids) => (value, id) => {
    if (!ids.includes(id)) return value
    const wrap = (w) => (w && typeof w === 'object' && 'size' in w ? { work: w } : w)
    return isList(value) ? value.map(wrap) : wrap(value)
  },
  /** A declaration kept as lines of blocks becomes the board of its rules. */
  declLines: () => (value) => {
    const board = (v) => (isList(v?.lines) ? boardOf(v.lines) : v)
    return isList(value) ? value.map(board) : board(value)
  },
  /** Things renamed in every formula, term and world kept (`at`: a level's own renaming on top). */
  objectNames: ({ names, at = {} }) => (value, level) => {
    const here = { ...names, ...(at[level] ?? {}) }
    const word = new RegExp(`\\b(${Object.keys(here).join('|')})\\b`, 'g')
    const rename = (text) => text.replace(word, (name) => here[name])
    const visit = (item, parent) => {
      if (typeof item === 'string') return rename(item)
      if (isList(item)) return item.map((v) => visit(v, parent))
      if (!item || typeof item !== 'object') return item
      return Object.fromEntries(Object.entries(item).map(([key, v]) => [parent === 'consts' ? rename(key) : key, visit(v, key)]))
    }
    return visit(value, '')
  },
}

const COUNTS = {
  /** How many of a level's tasks count passed: none (0), fewer by `less`, or at most `most`. */
  passed: (levels) => (passed, id) => {
    const r = levels[id]
    if (r === undefined) return passed
    if (r === 0) return 0
    return Math.min(Math.max(0, passed - (r.less ?? 0)), r.most ?? Infinity)
  },
}

/** A migration item as the function the shared migrations run on every level's kept state. */
export const migration = (call) => {
  const [name, params] = callOf(call)
  return MIGRATIONS[name](params)
}
/** A count item as the function the shared migrations run on how many tasks of a level are passed. */
export const count = (call) => {
  const [name, params] = callOf(call)
  return COUNTS[name](params)
}

/** game.json's saves with every { data: item } and { tasks: item } a function. */
export const savesOf = (saves) => saves.map((step) => ({ ...step, ops: step.ops.map((op) => ('data' in op ? { data: migration(op.data) } : 'tasks' in op ? { tasks: count(op.tasks) } : op)) }))
