// What a level's outputs must be, tick by tick: the signals content names for them (vocabulary.js want). A level writes
// `want: { output name: { item: params } }`; each item here gives, for a test (its bus built, course.js), one value a
// tick (undefined: anything will do), the lane the waveform draws under the output as 「应当」.
import { callOf } from '../../engine/schema.js'
import { bitsOf, crc15, frameBits, stuff } from './bus.js'

/** A controller may start talking once the bus has been recessive this many bits in a row; an identifier is as long. */
const QUIET = 11

// How many ones ran on `bits` up to tick t (not counting t).
const onesBefore = (bits, t) => {
  let n = 0
  for (let k = t - 1; k >= 0 && bits[k] === 1; k--) n++
  return n
}
const each = (test, f) => test.bus.bits.map((_, t) => f(t))

const destuff = (bits, resets) => {
  let previous = null
  let run = 0
  return bits.map((bit, tick) => {
    if (resets?.[tick]) { previous = null; run = 0 }
    const stuffed = run === 5
    run = bit === previous ? run + 1 : 1
    previous = bit
    return stuffed ? null : bit
  })
}

const serial = ({ value, start, advance }, test) => {
  let byte = 0
  let position = 8
  return each(test, (tick) => {
    if (test.inputs[start][tick]) { byte = test.inputs[value][tick]; position = 0 }
    const busy = position < 8
    const bit = busy ? (byte >> (7 - position)) & 1 : null
    const allowed = advance === undefined || Boolean(test.inputs[advance][tick])
    const done = position === 7 && allowed
    if (busy && allowed) position++
    return { bit, busy, done }
  })
}

const serialField = ({ value, width, start, advance }, test) => {
  let word = 0
  let size = 0
  let position = 0
  let busy = false
  return each(test, (tick) => {
    if (test.inputs[start][tick]) { word = test.inputs[value][tick]; size = test.inputs[width][tick]; position = 0; busy = true }
    const bit = busy ? (word >> (size - position - 1)) & 1 : null
    const done = busy && position === size - 1 && Boolean(test.inputs[advance][tick])
    const result = { bit, busy, done }
    if (busy && test.inputs[advance][tick]) { position++; if (position === size) busy = false }
    return result
  })
}

const stuffedSerial = ({ value, start }, test) => {
  let byte = 0
  let position = 8
  let previous = null
  let run = 0
  let original = []
  return each(test, (tick) => {
    if (test.inputs[start][tick]) { byte = test.inputs[value][tick]; position = 0; previous = null; run = 0; original = [] }
    const inserted = run === 5
    const accepted = !inserted && position < 8
    const bit = inserted ? 1 - previous : accepted ? (byte >> (7 - position)) & 1 : null
    const done = accepted && position === 7
    if (accepted) { original.push(bit); position++ }
    if (bit !== null) { run = bit === previous ? run + 1 : 1; previous = bit }
    return { bit, done, crc: done ? crc15(original) : null }
  })
}

const stuffedOutput = ({ bit, valid, start }, test) => {
  let previous = null
  let run = 0
  return each(test, (tick) => {
    if (test.inputs[start][tick]) { previous = null; run = 0 }
    const inserted = run === 5
    const accepted = !inserted && Boolean(test.inputs[valid][tick])
    const out = inserted ? 1 - previous : accepted ? test.inputs[bit][tick] : null
    if (out !== null) {
      run = out === previous ? run + 1 : 1
      previous = out
    }
    return { out, accepted: Number(accepted), inserted }
  })
}

// Polynomial long division over GF(2), independently of the player's shift-register circuit.
const remainders = ({ bit, enable, reset, width, poly }, test) => {
  let bits = []
  const divisor = (1 << width) | poly
  return each(test, (tick) => {
    if (test.inputs[reset][tick]) bits = []
    if (test.inputs[enable][tick]) bits.push(test.inputs[bit][tick])
    let remainder = 0
    for (const value of [...bits, ...Array(width).fill(0)]) {
      remainder = (remainder << 1) | value
      if (remainder & (1 << width)) remainder ^= divisor
    }
    return remainder
  })
}

const WANTS = {
  line: () => (test) => test.bus.bits,
  previous: ({ first }) => (test) => each(test, (t) => (t ? test.bus.bits[t - 1] : first)),
  delayedInput: ({ input, first }) => (test) => each(test, (t) => (t ? test.inputs[input][t - 1] : first)),
  serialBit: (params) => (test) => serial(params, test).map((step) => step.bit),
  serialBusy: (params) => (test) => serial(params, test).map((step) => step.busy),
  serialDone: (params) => (test) => serial(params, test).map((step) => step.done),
  serialDrive: (params) => (test) => serial(params, test).map((step) => step.bit ?? 1),
  pacedBit: (params) => (test) => serial(params, test).map((step) => step.bit),
  pacedBusy: (params) => (test) => serial(params, test).map((step) => step.busy),
  pacedDone: (params) => (test) => serial(params, test).map((step) => step.done),
  fieldBit: (params) => (test) => serialField(params, test).map((step) => step.bit),
  fieldBusy: (params) => (test) => serialField(params, test).map((step) => step.busy),
  fieldDone: (params) => (test) => serialField(params, test).map((step) => step.done),
  fieldDrive: (params) => (test) => serialField(params, test).map((step, tick) => test.inputs[params.advance][tick] ? step.bit ?? 1 : 1),
  queueSerialDrive: () => (test) => {
    const bits = test.queue.flatMap((value) => bitsOf(value, 8))
    return each(test, (tick) => bits[tick] ?? 1)
  },
  queueSerialNext: () => (test) => each(test, (tick) => tick < test.queue.length * 8 && tick % 8 === 7),
  stuffedSerialDrive: (params) => (test) => stuffedSerial(params, test).map((step) => step.bit ?? 1),
  stuffedSerialDone: (params) => (test) => stuffedSerial(params, test).map((step) => step.done),
  stuffedSerialCrc: (params) => (test) => stuffedSerial(params, test).map((step) => step.crc),
  stuffOut: (params) => (test) => stuffedOutput(params, test).map((step) => step.out),
  stuffAccepted: (params) => (test) => stuffedOutput(params, test).map((step) => step.accepted),
  stuffInserted: (params) => (test) => stuffedOutput(params, test).map((step) => step.inserted),
  stuffDrive: (params) => (test) => stuffedOutput(params, test).map((step) => step.out ?? 1),
  unchanged: ({ first }) => (test) => each(test, (t) => test.bus.bits[t] === (t ? test.bus.bits[t - 1] : first)),
  tick: () => (test) => each(test, (t) => t),
  since: ({ tick }) => (test) => each(test, (t) => t >= tick),
  streak: ({ input }) => (test) => each(test, (t) => onesBefore(test.inputs[input], t)),
  startOfFrame: () => (test) => each(test, (t) => test.bus.bits[t] === 0 && onesBefore(test.bus.bits, t) >= QUIET),
  gathered: ({ bit, go }) => (test) => {
    let acc = 0
    return each(test, (t) => (acc = test.inputs[go][t] ? acc * 2 + test.inputs[bit][t] : 0))
  },
  destuffedGather: ({ input }) => (test) => {
    let value = 0
    return WANTS.destuffed({ input })(test).map((bit) => {
      if (bit !== null) value = value * 2 + bit
      return value
    })
  },
  destuffValid: ({ input }) => (test) => WANTS.destuffed({ input })(test).map((bit) => bit !== null),
  destuffed: ({ input }) => (test) => destuff(test.inputs[input]),
  destuffedReset: ({ input, reset }) => (test) => destuff(test.inputs[input], test.inputs[reset]),
  destuffValidReset: ({ input, reset }) => (test) => destuff(test.inputs[input], test.inputs[reset]).map((bit) => bit !== null),
  dataLength: () => (test) => {
    const out = test.bus.bits.map(() => null)
    for (const frame of test.bus.frames) {
      const header = [0, ...bitsOf(frame.id, 11), 0, 0, 0, ...bitsOf(frame.data.length, 4)]
      const last = frame.at + stuff(header.slice(0, -1)).length
      out[last] = frame.data.length
    }
    return out
  },
  dataByte: () => (test) => {
    const out = test.bus.bits.map(() => null)
    for (const frame of test.bus.frames) {
      const prefix = [0, ...bitsOf(frame.id, 11), 0, 0, 0, ...bitsOf(frame.data.length, 4)]
      for (const byte of frame.data) {
        const bits = bitsOf(byte, 8)
        const last = frame.at + stuff([...prefix, ...bits.slice(0, -1)]).length
        out[last] = byte
        prefix.push(...bits)
      }
    }
    return out
  },
  endOfFrame: () => (test) => {
    const out = test.bus.bits.map(() => null)
    for (const frame of test.bus.frames) out[frame.at + frameBits(frame).length - 4] = true
    return out
  },
  frameIndex: () => (test) => {
    const out = test.bus.bits.map(() => null)
    test.bus.frames.forEach((frame, index) => { out[frame.at] = index + 1 })
    return out
  },
  stuffingError: ({ bit, enable, reset }) => (test) => {
    let previous = null
    let run = 0
    let error = false
    return each(test, (tick) => {
      if (test.inputs[reset][tick]) { previous = null; run = 0; error = false }
      if (test.inputs[enable][tick]) {
        const value = test.inputs[bit][tick]
        run = value === previous ? run + 1 : 1
        previous = value
        if (run >= 6) error = true
      }
      return Number(error)
    })
  },
  frameStatus: ({ bit }) => (test) => {
    const line = test.inputs[bit]
    const out = test.bus.bits.map(() => null)
    for (const frame of test.bus.frames) {
      const original = []
      const required = 34 + frame.data.length * 8
      let previous = null
      let run = 0
      let tick = frame.at
      let failed = false
      while (original.length < required || run === 5) {
        const value = line[tick]
        if (run === 5) {
          if (value === previous) { out[tick] = false; failed = true; break }
          previous = value
          run = 1
        } else {
          original.push(value)
          run = value === previous ? run + 1 : 1
          previous = value
        }
        tick++
      }
      if (!failed) out[tick] = crc15(original) === 0
    }
    return out
  },
  bitParity: ({ a, b, c }) => (test) => each(test, (tick) => test.inputs[a][tick] ^ test.inputs[b][tick] ^ test.inputs[c][tick]),
  remainder: (params) => (test) => remainders(params, test),
  crcCheck: (params) => (test) => remainders(params, test).map((value, tick) => test.inputs[params.finish][tick] ? value === 0 : null),
  identifier: () => (test) => {
    const out = test.bus.bits.map(() => null)
    for (const f of test.bus.frames) {
      const prefix = [0, ...bitsOf(f.id, 11).slice(0, -1)]
      out[f.at + stuff(prefix).length] = f.id
    }
    return out
  },
}

/** A level's `want` as the function run.js checks a test by: test → { output name: [value per tick] }. */
export const wantOf = (want) => {
  const signals = Object.entries(want).map(([name, call]) => {
    const [item, params] = callOf(call)
    return [name, WANTS[item](params)]
  })
  return (test) => Object.fromEntries(signals.map(([name, f]) => [name, f(test)]))
}
