// Programs the simulated kernel (kernel.js) can run: the helpers every program uses to read and write whole texts,
// the built-in commands, and a teletype program (lines.js) turned into a command that streams its input line by line.
import { sys } from './kernel.js'
import { BUILTINS, LINE_PARTS, linesOf } from './lines.js'
import { runBoard } from '../../engine/boards.js'

/** Read fd to its end of file. */
export function* readAll(fd) {
  let text = ''
  for (;;) {
    const chunk = yield sys.read(fd, 16)
    if (typeof chunk !== 'string' || chunk === '') return text
    text += chunk
  }
}
/** Write all of `text`, however short each write comes back. Returns false if a write failed. */
export function* writeAll(fd, text) {
  let rest = text
  while (rest.length) {
    const n = yield sys.write(fd, rest)
    if (typeof n !== 'number' || n < 0) return false
    rest = rest.slice(n)
  }
  return true
}

/** cat: stdin to stdout, chunk by chunk (it never needs the whole input). */
export function* cat() {
  for (;;) {
    const chunk = yield sys.read(0, 16)
    if (typeof chunk !== 'string' || chunk === '') return 0
    yield* writeAll(1, chunk)
  }
}

/** A whole-input command (BUILTINS) as a program: read everything, write the result. */
export const builtin = (name) => function* () {
  yield* writeAll(1, BUILTINS[name](yield* readAll(0)))
  return 0
}

/**
 * A teletype program as a command: it reads stdin a chunk at a time and runs the board on each whole line as soon as
 * the line is in, then the end board at end of file. What it prints is what runLines prints on the whole input.
 */
export const lineCommand = (program) => function* () {
  const names = Object.keys(program.registers ?? {})
  let registers = { ...(program.registers ?? {}) }
  const runBoardOn = function* (circuit, line) {
    if (!circuit) return
    const { values } = runBoard(circuit, { parts: LINE_PARTS, ctx: { line, registers } })
    const next = { ...registers }
    let print = null
    for (const n of circuit.nodes) {
      if (n.type === 'print') print = values.get(n.id) ?? null
      if (n.type === 'set' && values.get(n.id) !== undefined && names.includes(n.params.name)) next[n.params.name] = values.get(n.id)
    }
    registers = next
    if (print !== null) yield* writeAll(1, `${print}\n`)
  }
  let pending = ''
  for (;;) {
    const chunk = yield sys.read(0, 16)
    const done = typeof chunk !== 'string' || chunk === ''
    pending += done ? '' : chunk
    const cut = done ? pending.length : pending.lastIndexOf('\n') + 1
    for (const line of linesOf(pending.slice(0, cut))) yield* runBoardOn(program.each, line)
    pending = pending.slice(cut)
    if (done) break
  }
  yield* runBoardOn(program.end, null)
  return 0
}
