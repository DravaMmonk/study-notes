// What a level's outputs must be, tick by tick: the signals content names for them (vocabulary.js want). A level writes
// `want: { output name: { item: params } }`; each item here gives, for a test (its bus built, course.js), one value a
// tick (undefined: anything will do), the lane the waveform draws under the output as 「应当」.
import { callOf } from '../../engine/schema.js'
import { arbitrationLength, bitsOf, crc15, frameBits, stuff, transmitBits, wiredAnd } from './bus.js'

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

const frameTransmission = ({ start }, test) => {
  const at = test.inputs[start]?.findIndex((value) => value === 1 || value === true) ?? -1
  if (!test.tx || at < 0) return { bits: [], at, next: [] }
  const bits = transmitBits(test.tx)
  const prefix = [0, ...bitsOf(test.tx.id, 11), 0, 0, 0, ...bitsOf(test.tx.data.length, 4)]
  const next = test.tx.data.map((byte) => {
    const word = bitsOf(byte, 8)
    const tick = at + stuff([...prefix, ...word.slice(0, -1)]).length
    prefix.push(...word)
    return tick
  })
  return { bits, at, next }
}

const arbitration = ({ bit, arbitration: phase, start }, test) => {
  let lost = false
  const others = (test.contenders ?? []).map((frame) => ({ at: frame.at ?? 0, bits: transmitBits(frame), end: arbitrationLength(frame.id), active: true }))
  return each(test, (tick) => {
    if (test.inputs[start][tick]) lost = false
    const drive = lost ? 1 : test.inputs[bit][tick]
    const said = others.map((other) => other.active && tick >= other.at ? other.bits[tick - other.at] ?? 1 : 1)
    let line = wiredAnd([test.bus.bits[tick], drive, ...said])
    if (test.flipTicks?.includes(tick)) line = 1 - line
    if (!lost && test.inputs[phase][tick] && drive === 1 && line === 0) lost = true
    others.forEach((other, k) => {
      const offset = tick - other.at
      if (other.active && offset >= 0 && offset < other.end && said[k] === 1 && line === 0) other.active = false
    })
    return { drive, lost: Number(lost), line }
  })
}

const winnerFields = (params, test) => {
  const trace = arbitration(params, test)
  const out = Object.fromEntries(['id', 'length', 'byte', 'status'].map((name) => [name, test.bus.bits.map(() => null)]))
  const original = []
  let previous = null
  let run = 0
  let length = null
  let identifier = 0
  for (let tick = test.txAt ?? 0; tick < trace.length; tick++) {
    const value = trace[tick].line
    if (run === 5) {
      if (value === previous) break
      previous = value
      run = 1
      continue
    }
    if (length !== null && original.length === 34 + length * 8) {
      if (trace[tick].lost) out.status[tick] = crc15(original) === 0
      break
    }
    const position = original.length
    original.push(value)
    run = value === previous ? run + 1 : 1
    previous = value
    if (position >= 1 && position <= 11) {
      identifier = identifier * 2 + value
      if (position === 11 && trace[tick].lost) out.id[tick] = identifier
    }
    if (position === 18) {
      length = original.slice(15, 19).reduce((number, bit) => number * 2 + bit, 0)
      if (trace[tick].lost) out.length[tick] = length
    }
    if (length !== null && position >= 19 && position < 19 + length * 8 && (position - 19) % 8 === 7 && trace[tick].lost) {
      out.byte[tick] = original.slice(position - 7, position + 1).reduce((number, bit) => number * 2 + bit, 0)
    }
  }
  return { ...out, trace }
}

// One initial contention, then the loser acknowledges the clean winning frame and retries after intermission.
const retryPlan = ({ start }, test) => {
  const at = test.inputs[start]?.findIndex((value) => value === 1 || value === true) ?? -1
  if (!test.tx || at < 0) return { drive: [], lost: [], done: [], next: [], attempts: [] }
  const bits = transmitBits(test.tx)
  const phaseEnd = arbitrationLength(test.tx.id)
  const bit = test.bus.bits.map((_, tick) => bits[tick - at] ?? 1)
  const phase = test.bus.bits.map((_, tick) => Number(tick >= at && tick - at < phaseEnd))
  const trace = arbitration({ bit: '__bit', arbitration: '__phase', start: '__start' }, { ...test, inputs: { ...test.inputs, __bit: bit, __phase: phase, __start: test.inputs[start] } })
  const lostAt = trace.findIndex((step) => step.lost)
  const winner = lostAt < 0 ? null : (test.contenders ?? []).filter((node) => (node.at ?? 0) === at).sort((a, b) => a.id - b.id)[0]
  const retry = winner ? at + frameBits(winner).length : -1
  const ack = winner ? at + frameBits(winner).length - 12 : -1
  const sendAt = retry >= 0 ? retry : at
  const pulse = test.bus.bits.map((_, tick) => Number(tick === sendAt))
  const { next } = frameTransmission({ start: '__retry' }, { ...test, inputs: { ...test.inputs, __retry: pulse } })
  return {
    drive: test.bus.bits.map((_, tick) => {
      if (lostAt < 0) return bits[tick - at] ?? 1
      if (tick <= lostAt) return bits[tick - at] ?? 1
      if (tick === ack) return 0
      return tick >= retry ? bits[tick - retry] ?? 1 : 1
    }),
    lost: test.bus.bits.map((_, tick) => Number(lostAt >= 0 && tick >= lostAt && tick < retry)),
    done: test.bus.bits.map((_, tick) => tick === sendAt + bits.length - 1),
    next: test.bus.bits.map((_, tick) => next.includes(tick)),
    attempts: test.bus.bits.map((_, tick) => Number(tick === at || tick === retry)),
  }
}

// Active-error retries on a quiet bus: a missing ACK is followed by a flag, delimiter and intermission.
const ackRetryPlan = ({ start }, test) => {
  const ticks = test.bus.bits.length
  const drive = Array(ticks).fill(1)
  const next = Array(ticks).fill(false)
  const rewind = Array(ticks).fill(false)
  const attempts = Array(ticks).fill(0)
  const done = Array(ticks).fill(false)
  const tec = Array(ticks).fill(0)
  const bits = test.tx ? transmitBits(test.tx) : []
  let at = test.inputs[start]?.findIndex((value) => value === 1 || value === true) ?? -1
  let errors = 0
  while (at >= 0 && at < ticks && bits.length) {
    attempts[at] = 1
    const ack = at + bits.length - 12
    const failed = ack < ticks && test.bus.bits[ack] === 1
    const end = failed ? ack : at + bits.length - 1
    for (let tick = at; tick <= end && tick < ticks; tick++) drive[tick] = bits[tick - at]
    const pulse = test.bus.bits.map((_, tick) => Number(tick === at))
    for (const tick of frameTransmission({ start: '__attempt' }, { ...test, inputs: { ...test.inputs, __attempt: pulse } }).next) if (tick < ticks) next[tick] = true
    if (!failed) {
      if (end < ticks) { done[end] = true; for (let tick = end; tick < ticks; tick++) tec[tick] = Math.max(0, errors * 8 - 1) }
      break
    }
    rewind[ack] = true
    errors++
    for (let tick = ack; tick < ticks; tick++) tec[tick] = errors * 8
    for (let tick = ack + 1; tick <= ack + 6 && tick < ticks; tick++) drive[tick] = 0
    at = ack + 18
  }
  return { drive, next, rewind, attempts, done, tec }
}

// Given a completed intermission on an otherwise idle bus, enforce the passive sender's extra eight bits.
const suspendReady = ({ end, mode }, test) => {
  let remaining = null
  return each(test, (tick) => {
    if (test.inputs[end][tick]) {
      remaining = test.inputs[mode][tick] === 0 ? 0 : test.inputs[mode][tick] === 1 ? 8 : null
      return false
    }
    if (remaining === null) return false
    if (remaining > 0) { remaining--; return false }
    return true
  })
}

const errorFlag = ({ error }, test) => {
  let position = 14
  return each(test, (tick) => {
    const drive = position < 6 ? 0 : 1
    const done = position === 13
    if (test.inputs[error][tick]) position = 0
    else if (position < 14) position++
    return { drive, done }
  })
}

const bitErrorFlag = ({ bit, arbitration: phase, ack, start }, test) => {
  let error = false
  let position = 14
  return each(test, (tick) => {
    if (test.inputs[start][tick]) error = false
    const drive = error ? (position < 6 ? 0 : 1) : test.inputs[bit][tick]
    const done = position === 13
    let line = wiredAnd([drive, test.bus.bits[tick]])
    if (test.flipTicks?.includes(tick)) line = 1 - line
    const detected = !error && !test.inputs[phase][tick] && !test.inputs[ack][tick] && drive !== line
    if (detected) error = true
    if (detected) position = 0
    else if (position < 14) position++
    return { drive, error: Number(error), done }
  })
}

// Event-level teaching subset; event 5 is the passive missing-ACK exception with no dominant passive-flag bit.
const faultCounts = ({ event, reset }, test) => {
  let tx = 0
  let rx = 0
  let off = false
  return each(test, (tick) => {
    if (test.inputs[reset][tick]) { tx = 0; rx = 0; off = false }
    if (!off) {
      const action = test.inputs[event][tick]
      if (action === 1 || (action === 5 && tx < 128 && rx < 128)) tx += 8
      else if (action === 2) tx = Math.max(0, tx - 1)
      else if (action === 3) rx++
      else if (action === 4) rx = rx > 127 ? 127 : Math.max(0, rx - 1)
      off = tx > 255
    }
    return { tx, rx, mode: off ? 2 : tx >= 128 || rx >= 128 ? 1 : 0 }
  })
}

const faultFlag = ({ report, ...params }, test) => {
  const modes = faultCounts(params, test)
  let position = 14
  return each(test, (tick) => {
    const mode = modes[tick].mode
    const drive = mode === 0 && position < 6 ? 0 : 1
    const done = mode !== 2 && position === 13
    if (mode !== 2 && test.inputs[report][tick]) position = 0
    else if (position < 14) position++
    return { drive, done }
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
  inputSignal: ({ input }) => (test) => test.inputs[input],
  bitError: ({ bit, arbitration: phase, ack, start }) => (test) => {
    let error = false
    return each(test, (tick) => {
      if (test.inputs[start][tick]) error = false
      const said = test.inputs[bit][tick]
      let line = wiredAnd([said, test.bus.bits[tick]])
      if (test.flipTicks?.includes(tick)) line = 1 - line
      if (!test.inputs[phase][tick] && !test.inputs[ack][tick] && said !== line) error = true
      return Number(error)
    })
  },
  errorFlagDrive: (params) => (test) => errorFlag(params, test).map((step) => step.drive),
  errorFlagDone: (params) => (test) => errorFlag(params, test).map((step) => step.done),
  bitErrorFlagDrive: (params) => (test) => bitErrorFlag(params, test).map((step) => step.drive),
  bitErrorFlagState: (params) => (test) => bitErrorFlag(params, test).map((step) => step.error),
  bitErrorFlagDone: (params) => (test) => bitErrorFlag(params, test).map((step) => step.done),
  faultCount: ({ which, ...params }) => (test) => faultCounts(params, test).map((step) => step[which]),
  faultMode: (params) => (test) => faultCounts(params, test).map((step) => step.mode),
  faultFlagDrive: (params) => (test) => faultFlag(params, test).map((step) => step.drive),
  faultFlagDone: (params) => (test) => faultFlag(params, test).map((step) => step.done),
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
  frameDrive: (params) => (test) => {
    const { bits, at } = frameTransmission(params, test)
    return each(test, (tick) => bits[tick - at] ?? 1)
  },
  frameLine: (params) => (test) => {
    const { bits, at } = frameTransmission(params, test)
    return each(test, (tick) => (bits[tick - at] ?? 1) & test.bus.bits[tick])
  },
  frameSent: (params) => (test) => {
    const { bits, at } = frameTransmission(params, test)
    return each(test, (tick) => at >= 0 && bits.length > 0 && tick === at + bits.length - 1)
  },
  frameQueueNext: (params) => (test) => {
    const { next } = frameTransmission(params, test)
    return each(test, (tick) => next.includes(tick))
  },
  frameArbitrating: ({ start }) => (test) => {
    const at = test.inputs[start]?.findIndex((value) => value === 1 || value === true) ?? -1
    const end = test.tx ? arbitrationLength(test.tx.id) : 0
    return each(test, (tick) => Number(at >= 0 && tick >= at && tick < at + end))
  },
  frameAck: (params) => (test) => {
    const { bits, at } = frameTransmission(params, test)
    return each(test, (tick) => Number(at >= 0 && bits.length > 0 && tick === at + bits.length - 12))
  },
  frameAckMissing: (params) => (test) => {
    const { bits, at } = frameTransmission(params, test)
    return each(test, (tick) => at >= 0 && bits.length > 0 && tick === at + bits.length - 12 ? (test.flipTicks?.includes(tick) ? 1 - test.bus.bits[tick] : test.bus.bits[tick]) === 1 : null)
  },
  arbitrationDrive: (params) => (test) => arbitration(params, test).map((step) => step.drive),
  arbitrationLost: (params) => (test) => arbitration(params, test).map((step) => step.lost),
  arbitrationLine: (params) => (test) => arbitration(params, test).map((step) => step.line),
  winnerIdentifier: (params) => (test) => winnerFields(params, test).id,
  winnerLength: (params) => (test) => winnerFields(params, test).length,
  winnerByte: (params) => (test) => winnerFields(params, test).byte,
  winnerStatus: (params) => (test) => winnerFields(params, test).status,
  receiverDrive: (params) => (test) => {
    const { trace, status } = winnerFields(params, test)
    return trace.map((step, tick) => tick > 0 && status[tick - 1] === true ? 0 : step.drive)
  },
  retryDrive: (params) => (test) => retryPlan(params, test).drive,
  retryLost: (params) => (test) => retryPlan(params, test).lost,
  retryDone: (params) => (test) => retryPlan(params, test).done,
  retryNext: (params) => (test) => retryPlan(params, test).next,
  retryAttempts: (params) => (test) => retryPlan(params, test).attempts,
  ackRetryDrive: (params) => (test) => ackRetryPlan(params, test).drive,
  ackRetryNext: (params) => (test) => ackRetryPlan(params, test).next,
  ackRetryRewind: (params) => (test) => ackRetryPlan(params, test).rewind,
  ackRetryAttempts: (params) => (test) => ackRetryPlan(params, test).attempts,
  ackRetryDone: (params) => (test) => ackRetryPlan(params, test).done,
  ackRetryTec: (params) => (test) => ackRetryPlan(params, test).tec,
  suspendReady: (params) => (test) => suspendReady(params, test),
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
  frameStatusReady: (params) => (test) => WANTS.frameStatus(params)(test).map((value) => Number(value !== null)),
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
