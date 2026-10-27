// The parts of 《软件工厂》's boards, for the shared engine (../../engine/circuit.js): what each computes, and what the
// editor needs to draw it (../../circuit/model.js). Three kinds of value run on the wires:
//
//   context  a list of entries (world.js): an issue, files, a listing, a test report, what the model did
//   action   what one model call gives (model.js): write, read, list, test or done
//   flag     true or false: whether the tests pass (null when they did not run this turn)
//
// The level gives the board its fixed cards: the issue (a context), the history of earlier turns (a context, in a loop),
// the code an issue comes with (1-2), and where the turn's results go: the repository (a write lands there), the
// output (what is kept for the next turn) and stop (a done action, or a true flag, ends the run).
//
// Primitives: model (a context in, an action out), concat (up to three contexts in order), read (a file: the one its
// setting names, or the one an action asks for), list (the repository's files, when an action asks), test (the tests,
// when an action asks or says done: a report, and whether they pass).
import { source, sink } from '../../engine/boards.js'
import { PartError } from '../../engine/circuit.js'
import { call } from './model.js'
import { fileEntry, listEntry, runTests } from './world.js'

const T = (zh, en) => ({ zh, en })

/** The value kind each part's output carries, and each input wants. */
export const KIND = { context: 'context', action: 'action', flag: 'flag' }

// A source and a sink by the level's names; each knows the kind of value it carries.
const given = (kind) => source({ kind })
const end = (accepts) => sink({ accepts })

/** The registry: type → part. */
export const PARTS = {
  issue: given(KIND.context),
  history: given(KIND.context),
  code: given(KIND.context),
  repo: end([KIND.action]),
  out: end([KIND.context]),
  stop: end([KIND.action, KIND.flag]),
  model: {
    inputs: ['in'],
    wants: { in: KIND.context },
    gives: KIND.action,
    eval: (ins, node, ctx) => {
      const made = call(ins.in, { mode: ctx.mode, window: ctx.window })
      ctx.calls?.push({ id: node.id, ...made })
      return made.action
    },
  },
  concat: {
    inputs: ['a', 'b', 'c'],
    optional: ['a', 'b', 'c'],
    wants: { a: KIND.context, b: KIND.context, c: KIND.context },
    gives: KIND.context,
    eval: (ins) => ['a', 'b', 'c'].flatMap((p) => ins[p] ?? []),
  },
  read: {
    inputs: ['ask'],
    optional: ['ask'],
    bare: true,
    wants: { ask: KIND.action },
    gives: KIND.context,
    eval: (ins, node, ctx) => {
      if (ins.ask !== undefined) return ins.ask?.type === 'read' ? [fileEntry(ctx.repo, ins.ask.file)] : []
      if (!node.params?.file) throw new PartError(T('还没选文件', 'No file picked'))
      return [fileEntry(ctx.repo, node.params.file)]
    },
  },
  list: {
    inputs: ['ask'],
    wants: { ask: KIND.action },
    gives: KIND.context,
    eval: (ins, node, ctx) => (ins.ask?.type === 'list' ? [listEntry(ctx.repo)] : []),
  },
  test: {
    inputs: ['when'],
    wants: { when: KIND.action },
    outputs: () => ['out', 'green'],
    gives: { out: KIND.context, green: KIND.flag },
    eval: (ins, node, ctx, key) => {
      const asked = ins.when?.type === 'test' || ins.when?.type === 'done'
      if (!asked) return key === 'green' ? null : []
      // One run a turn, shared by both outputs.
      ctx.ran ??= runTests(ctx.issue, ctx.state)
      return key === 'green' ? ctx.ran.green : [ctx.ran]
    },
  },
}

/** The kind of value a wire's source carries. */
export function kindOf(node, key) {
  const part = PARTS[node?.type]
  if (!part) return null
  if (part.source) return part.kind
  return typeof part.gives === 'object' ? part.gives[key] : part.gives
}

/** The kinds an input port takes. */
export function wantsOf(node, port) {
  const part = PARTS[node?.type]
  if (!part) return []
  if (part.sink) return part.accepts
  return [part.wants?.[port]].filter(Boolean)
}

export const FIXED = ['issue', 'history', 'code', 'repo', 'out', 'stop']
export const PRIMITIVES = ['model', 'concat', 'read', 'list', 'test']
