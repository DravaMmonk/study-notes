// What a level's outputs and wires out must be: the signals content names for them (vocabulary.js want). A level
// writes `want: { output or wire-out name: { item: params } }`. Each item reads a test (course.js: what arrives on each
// wire in, the inputs, the queue) and is one of two kinds:
//
//   tick by tick   one value a tick (undefined: anything will do), checked as the run goes, drawn under the output as
//                  「应当」
//   in order       the values the output gives that are not 「—」, in order and timing aside, or what the far end of a
//                  wire out decodes; checked once the run is over
//
// An item gives { ticks: [value per tick] } or { order: [value…], words: { zh, en } (what the list is) }.
import { callOf } from '../../engine/schema.js'
import { decode } from './wire.js'

const each = (test, f) => Array.from({ length: test.ticks }, (_, t) => f(t))
const wire = (test, name) => test.wires[name] ?? []
const T = (zh, en) => ({ zh, en })
// A run of decoded events laid out tick by tick: the value of an event on its tick, 「—」 on every other.
const laid = (test, events, value) => {
  const out = each(test, () => null)
  for (const e of events) if (e.at < test.ticks) out[e.at] = value(e)
  return out
}
// What a test sends on the queue the board pulls from, as frames.
const queued = (test) => test.queue ?? []

const WANTS = {
  echo: ({ wire: w }) => (test) => ({ ticks: each(test, (t) => wire(test, w)[t] ?? 0) }),
  opposite: ({ wire: w }) => (test) => ({ ticks: each(test, (t) => 1 - (wire(test, w)[t] ?? 0)) }),
  differ: ({ a, b }) => (test) => ({ ticks: each(test, (t) => ((wire(test, a)[t] ?? 0) === (wire(test, b)[t] ?? 0) ? 0 : 1)) }),
  late: ({ wire: w, first }) => (test) => ({ ticks: each(test, (t) => (t ? wire(test, w)[t - 1] ?? 0 : first)) }),
  heard: ({ wire: w }) => (test) => ({ ticks: each(test, (t) => (wire(test, w).slice(0, t + 1).includes(1) ? 1 : 0)) }),
  count: ({ reset }) => (test) => {
    let n = -1
    return { ticks: each(test, (t) => (n = test.inputs[reset][t] === 1 ? 0 : n + 1)) }
  },
  serial: ({ byte, start }) => (test) => {
    let from = null
    return { ticks: each(test, (t) => {
      if (from === null && test.inputs[start][t] === 1) from = t
      if (from === null || t - from >= 8) return 0
      return (test.inputs[byte][from] >> (7 - (t - from))) & 1
    }) }
  },
  pattern: ({ wire: w, bits }) => (test) => ({ ticks: each(test, (t) => (t + 1 >= bits.length && wire(test, w).slice(t + 1 - bits.length, t + 1).join('') === bits ? 1 : 0)) }),
  remainder: ({ wire: w, poly, reset }) => (test) => {
    let r = 0
    const top = 1 << (poly.length - 1)
    const g = parseInt(poly, 2)
    return { ticks: each(test, (t) => {
      if (reset && test.inputs[reset][t] === 1) r = 0
      r = (r << 1) | (wire(test, w)[t] ?? 0)
      if (r & top) r ^= g
      return r
    }) }
  },
  decoded: ({ wire: w, format, poly }) => (test) => ({ ticks: laid(test, decode(format, wire(test, w), poly).filter((e) => e.byte !== undefined), (e) => e.byte) }),
  intact: ({ wire: w, format, poly }) => (test) => ({ ticks: laid(test, decode(format, wire(test, w), poly).filter((e) => e.intact !== undefined), (e) => e.intact) }),
  given: () => (test, name) => ({ ticks: each(test, (t) => test.expect?.[name]?.[t] ?? undefined) }),
  bytes: ({ wire: w, format, poly, intactOnly }) => (test) => {
    const events = decode(format, wire(test, w), poly)
    const kept = intactOnly ? framesOf(events).filter((f) => f.intact).flatMap((f) => f.bytes) : events.filter((e) => e.byte !== undefined).map((e) => e.byte)
    return { order: kept, words: intactOnly ? T('完好的帧里的字节', 'the bytes of the intact frames') : T('收到的字节', 'the bytes received') }
  },
  ends: ({ wire: w, format, poly }) => (test) => ({ order: decode(format, wire(test, w), poly).filter((e) => e.end).map((e) => e.intact), words: T('每一帧结束时它是否完好', 'at each frame’s end, whether it is intact') }),
  sent: ({ format, poly }) => (test) => ({ far: { format, poly }, order: decodedOrder(format, queued(test), poly), words: T('线那头收到的', 'what the far end receives') }),
  relayed: ({ wire: w, format, poly }) => (test) => ({ far: { format, poly }, order: framesOf(decode(format, wire(test, w), poly)).filter((f) => f.intact).flatMap((f) => [...f.bytes, 'end']), words: T('线那头收到的完好的帧', 'the intact frames the far end receives') }),
}

/** Events grouped into frames: [{ bytes, intact }]. */
function framesOf(events) {
  const out = []
  let bytes = []
  for (const e of events) {
    if (e.byte !== undefined) bytes.push(e.byte)
    if (e.end) {
      out.push({ bytes, intact: e.intact })
      bytes = []
    }
  }
  return out
}

/** What a far end decoding `format` must make of the queue's frames: their bytes (and each frame's end, for frames). */
const decodedOrder = (format, frames) => (format === 'flag' || format === 'flagcheck' ? frames.flatMap((f) => [...f, 'end']) : frames.flat())

/** What a far end decoding `format` makes of the bits a board said, as `sent` and `relayed` compare it. */
export function farEnd({ format, poly }, bits) {
  const events = decode(format, bits, poly)
  return format === 'flag' || format === 'flagcheck' ? framesOf(events).filter((f) => f.intact).flatMap((f) => [...f.bytes, 'end']) : events.filter((e) => e.byte !== undefined && e.intact !== false).map((e) => e.byte)
}

/** A level's `want` as the function run.js checks a test by: test → { name: { ticks } | { order, words, far? } }. */
export const wantOf = (want) => {
  const signals = Object.entries(want).map(([name, call]) => {
    const [item, params] = callOf(call)
    return [name, WANTS[item](params ?? {})]
  })
  return (test) => Object.fromEntries(signals.map(([name, f]) => [name, f(test, name)]))
}
