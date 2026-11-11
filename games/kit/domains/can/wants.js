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

const frameStatusTrace = (bit, test) => {
  const line = test.inputs[bit]
  const status = test.bus.bits.map(() => null)
  const kind = test.bus.bits.map(() => null)
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
        if (value === previous) { status[tick] = false; kind[tick] = 1; failed = true; break }
        previous = value
        run = 1
      } else {
        original.push(value)
        run = value === previous ? run + 1 : 1
        previous = value
      }
      tick++
    }
    if (!failed) { status[tick] = crc15(original) === 0; kind[tick] = status[tick] ? 0 : 2 }
  }
  return { status, kind }
}

// Fields observed before a frame's check result; values after a bad result are not valid frame data.
const receivedFields = (test, line, kinds) => {
  const result = Object.fromEntries(['id', 'length', 'byte'].map((name) => [name, test.bus.bits.map(() => null)]))
  for (let f = 0; f < test.bus.frames.length; f++) {
    const frame = test.bus.frames[f]
    const limit = test.bus.frames[f + 1]?.at ?? line.length
    const status = kinds.findIndex((value, tick) => tick >= frame.at && tick < limit && value !== null)
    const end = status < 0 ? limit : status
    const raw = []
    let previous = null
    let run = 0
    for (let tick = frame.at; tick < end; tick++) {
      const value = line[tick]
      if (run === 5) { previous = value; run = 1; continue }
      raw.push(value)
      run = value === previous ? run + 1 : 1
      previous = value
      const position = raw.length - 1
      if (position === 11) result.id[tick] = raw.slice(1, 12).reduce((n, bit) => n * 2 + bit, 0)
      if (position === 18) result.length[tick] = raw.slice(15, 19).reduce((n, bit) => n * 2 + bit, 0)
      if (position >= 19 && position < 19 + frame.data.length * 8 && (position - 19) % 8 === 7) result.byte[tick] = raw.slice(position - 7, position + 1).reduce((n, bit) => n * 2 + bit, 0)
    }
    if (status >= 0 && kinds[status] !== 0) for (const values of Object.values(result)) for (let tick = status; tick < limit; tick++) values[tick] = undefined
  }
  return result
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

// Two equal identifiers and different payloads; each active sender reports its first sampled bit mismatch.
const sameIdCollision = ({ bit, arbitration: phase, ack, start }, test) => {
  const peer = test.contenders[0]
  if (!peer) return each(test, () => ({ drive: 1, error: 0, done: false }))
  const peerBits = transmitBits(peer)
  const peerEnd = arbitrationLength(peer.id)
  let ownError = null
  let peerError = null
  return each(test, (tick) => {
    const offset = tick - (peer.at ?? 0)
    const drive = ownError === null ? test.inputs[bit][tick] : tick <= ownError + 6 ? 0 : 1
    const rival = peerError === null ? peerBits[offset] ?? 1 : tick <= peerError + 6 ? 0 : 1
    const line = wiredAnd([drive, rival, test.bus.bits[tick]])
    if (ownError === null && !test.inputs[phase][tick] && !test.inputs[ack][tick] && drive !== line) ownError = tick
    if (peerError === null && offset >= peerEnd && offset < peerBits.length && offset !== peerBits.length - 12 && rival !== line) peerError = tick
    return { drive, error: Number(ownError !== null), done: ownError !== null && tick === ownError + 14 }
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
      if (end < ticks) { done[end] = true; for (let tick = end - 3; tick < ticks; tick++) tec[tick] = Math.max(0, errors * 8 - 1) }
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

// One initial contention followed by transmit-error retries on an otherwise idle bus.
const controllerPlan = ({ start, prep, reset, request, receive = false, intervening = false }, test) => {
  const ticks = test.bus.bits.length
  const incoming = receive ? receiveUnified({ prep, reset }, test) : null
  const drive = incoming ? [...incoming.drive] : Array(ticks).fill(1)
  const lost = Array(ticks).fill(0)
  const next = Array(ticks).fill(false)
  const rewind = Array(ticks).fill(false)
  const attempts = Array(ticks).fill(0)
  const done = Array(ticks).fill(false)
  const actions = incoming ? [...incoming.event] : prep ? [...(test.inputs[prep] ?? Array(ticks).fill(0))] : Array(ticks).fill(0)
  const resets = reset ? [...(test.inputs[reset] ?? Array(ticks).fill(0))] : test.bus.bits.map((_, tick) => Number(tick === 0))
  const accepted = Array(ticks).fill(false)
  const error = Array(ticks).fill(false)
  const bits = test.tx ? transmitBits(test.tx) : []
  const initial = test.inputs[start]?.findIndex((value) => value === 1 || value === true) ?? -1
  let at = initial
  let receivedWinner = false
  const rival = test.contenders?.[0]
  if (at >= 0 && rival && rival.id < test.tx.id) {
    const rivalBits = transmitBits(rival)
    const end = arbitrationLength(test.tx.id)
    const loss = bits.slice(0, end).findIndex((bit, tick) => bit === 1 && rivalBits[tick] === 0)
    if (loss >= 0) {
      attempts[at] = 1
      const winnerAck = at + rivalBits.length - 12
      const winnerCrc = winnerAck - 1
      const retry = at + rivalBits.length
      for (let tick = at; tick <= at + loss && tick < ticks; tick++) drive[tick] = bits[tick - at]
      for (let tick = at + loss; tick < retry && tick < ticks; tick++) lost[tick] = 1
      if (winnerAck < ticks) drive[winnerAck] = 0
      if (incoming && winnerAck < ticks) {
        incoming.kind[winnerCrc] = 0
        incoming.ready[winnerCrc] = 1
        actions[winnerAck] = 4
        receivedWinner = true
      }
      at = retry
    }
  }
  const before = faultCounts({ event: '__actions', reset: '__reset' }, { ...test, inputs: { ...test.inputs, __actions: actions, __reset: resets } })[initial - 1]
  let count = before?.tx ?? 0
  let receiveCount = before?.rx ?? 0
  if (receivedWinner) receiveCount = receiveCount > 127 ? 127 : Math.max(0, receiveCount - 1)
  while (at >= 0 && at < ticks && bits.length) {
    attempts[at] = 1
    const ack = at + bits.length - 12
    const bitError = (test.flipTicks ?? []).find((tick) => tick >= at + arbitrationLength(test.tx.id) && tick < ack)
    const missing = ack < ticks && test.bus.bits[ack] === 1
    const failure = bitError ?? (missing ? ack : null)
    const end = failure ?? at + bits.length - 1
    for (let tick = at; tick <= end && tick < ticks; tick++) drive[tick] = bits[tick - at]
    const pulse = test.bus.bits.map((_, tick) => Number(tick === at))
    for (const tick of frameTransmission({ start: '__attempt' }, { ...test, inputs: { ...test.inputs, __attempt: pulse } }).next) if (tick < ticks && tick <= end) next[tick] = true
    if (failure === null) {
      if (end < ticks) { done[end] = true; actions[end - 3] = 2 }
      break
    }
    rewind[failure] = true
    error[failure] = true
    const active = count < 128 && receiveCount < 128
    actions[failure] = bitError !== undefined ? 1 : 5
    if (active || bitError !== undefined) count += 8
    if (active) for (let tick = failure + 1; tick <= failure + 6 && tick < ticks; tick++) drive[tick] = 0
    if (count >= 256 && request) {
      const ready = failure + 128 * 11
      const acceptAt = test.inputs[request]?.findIndex((value, tick) => tick >= ready && Boolean(value)) ?? -1
      if (acceptAt < 0 || acceptAt + 1 >= ticks) break
      accepted[acceptAt] = true
      resets[acceptAt + 1] = 1
      count = 0
      receiveCount = 0
      at = acceptAt + 1
    } else {
      const passive = count >= 128 || receiveCount >= 128
      const frame = intervening && passive ? test.bus.frames[1] : null
      const end = failure + 17
      if (frame && frame.at > end && frame.at <= end + 8) {
        at = frame.at + transmitBits(frame).length
        receiveCount = receiveCount > 127 ? 127 : Math.max(0, receiveCount - 1)
      } else at = failure + 18 + (passive ? 8 : 0)
    }
  }
  const counts = faultCounts({ event: '__actions', reset: '__reset' }, { ...test, inputs: { ...test.inputs, __actions: actions, __reset: resets } })
  return { drive, lost, next, rewind, attempts, done, tec: counts.map((step) => step.tx), rec: counts.map((step) => step.rx), mode: counts.map((step) => step.mode), error, accepted, kind: incoming?.kind, ready: incoming?.ready }
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

// A previously prepared passive sender retries on a quiet bus; missing ACK alone does not increase TEC.
const passiveAckRetry = ({ start, prep, reset }, test) => {
  const ticks = test.bus.bits.length
  const drive = Array(ticks).fill(1)
  const next = Array(ticks).fill(false)
  const rewind = Array(ticks).fill(false)
  const attempts = Array(ticks).fill(0)
  const done = Array(ticks).fill(false)
  const events = [...test.inputs[prep]]
  const bits = test.tx ? transmitBits(test.tx) : []
  let at = test.inputs[start]?.findIndex((value) => value === 1 || value === true) ?? -1
  while (at >= 0 && at < ticks && bits.length) {
    attempts[at] = 1
    const ack = at + bits.length - 12
    const failed = ack < ticks && test.bus.bits[ack] === 1
    const end = failed ? ack : at + bits.length - 1
    for (let tick = at; tick <= end && tick < ticks; tick++) drive[tick] = bits[tick - at]
    const pulse = test.bus.bits.map((_, tick) => Number(tick === at))
    for (const tick of frameTransmission({ start: '__attempt' }, { ...test, inputs: { ...test.inputs, __attempt: pulse } }).next) if (tick < ticks) next[tick] = true
    if (!failed) {
      if (end < ticks) { done[end] = true; events[end - 3] = 2 }
      break
    }
    rewind[ack] = true
    events[ack] = 5
    // Six passive flag bits, eight delimiter bits, three intermission bits, eight suspended bits.
    at = ack + 26
  }
  const counts = faultCounts({ event: '__events', reset }, { ...test, inputs: { ...test.inputs, __events: events } })
  return { drive, next, rewind, attempts, done, tec: counts.map((step) => step.tx), mode: counts.map((step) => step.mode) }
}

const recoveryObserver = () => {
  let run = 0
  let groups = 0
  return (bit, off) => {
    if (!off) { run = 0; groups = 0 }
    else if (groups < 128) {
      if (bit === 1) {
        run++
        if (run === 11) { groups++; run = 0 }
      } else run = 0
    }
    return { groups, ready: groups === 128 }
  }
}
const busOffRecovery = ({ bit, off }, test) => {
  const observe = recoveryObserver()
  return each(test, (tick) => observe(test.inputs[bit][tick], test.inputs[off][tick]))
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
const faultCounter = () => {
  let tx = 0
  let rx = 0
  let off = false
  return (action, reset) => {
    if (reset) { tx = 0; rx = 0; off = false }
    if (!off) {
      if (action === 1 || (action === 5 && tx < 128 && rx < 128)) tx += 8
      else if (action === 2) tx = Math.max(0, tx - 1)
      else if (action === 3) rx++
      else if (action === 4) rx = rx > 127 ? 127 : Math.max(0, rx - 1)
      off = tx > 255
    }
    return { tx, rx, mode: off ? 2 : tx >= 128 || rx >= 128 ? 1 : 0 }
  }
}
const faultCounts = ({ event, reset }, test) => {
  const count = faultCounter()
  return each(test, (tick) => count(test.inputs[event][tick], test.inputs[reset][tick]))
}

const recoveryController = ({ event, init, bit, request }, test) => {
  const observe = recoveryObserver()
  const count = faultCounter()
  let previousMode = 0
  let resetNext = false
  return each(test, (tick) => {
    const observation = observe(test.inputs[bit][tick], previousMode === 2)
    const accepted = observation.ready && Boolean(test.inputs[request][tick])
    const state = count(test.inputs[event][tick], test.inputs[init][tick] || resetNext)
    previousMode = state.mode
    resetNext = accepted
    return { ...state, accepted }
  })
}

// One incoming frame with no other error flag; CRC errors signal after the ACK delimiter.
const receiverPlan = ({ prep, reset }, test) => {
  const ticks = test.bus.bits.length
  const received = test.bus.bits.map((bit, tick) => test.flipTicks?.includes(tick) ? 1 - bit : bit)
  const kind = frameStatusTrace('__received', { ...test, inputs: { ...test.inputs, __received: received } }).kind
  const fields = receivedFields(test, received, kind)
  const drive = Array(ticks).fill(1)
  const ack = Array(ticks).fill(0)
  const actions = [...(test.inputs[prep] ?? Array(ticks).fill(0))]
  for (let tick = 0; tick < ticks; tick++) {
    if (kind[tick] === 0 && tick + 1 < ticks) { drive[tick + 1] = 0; ack[tick + 1] = 1; actions[tick + 1] = 4 }
    if (kind[tick] === 1 || kind[tick] === 2) {
      actions[tick] = 3
      const start = tick + (kind[tick] === 1 ? 1 : 3)
      for (let k = start; k < start + 6 && k < ticks; k++) drive[k] = 0
    }
  }
  const counts = faultCounts({ event: '__actions', reset }, { ...test, inputs: { ...test.inputs, __actions: actions } })
  return { drive, ack, kind, fields, ready: kind.map((value) => Number(value !== null)), rec: counts.map((step) => step.rx), event: actions }
}

const receiveStateDrive = ({ mode, ...params }, test) => {
  const { drive, kind } = receiverPlan(params, test)
  for (let tick = 0; tick < kind.length; tick++) {
    if ((kind[tick] === 1 || kind[tick] === 2) && test.inputs[mode][tick] === 1) {
      const start = tick + (kind[tick] === 1 ? 1 : 3)
      for (let k = start; k < start + 6 && k < drive.length; k++) drive[k] = 1
    }
  }
  return drive
}

// Receive using one shared fault counter; the previous state chooses the current error flag.
const receiveUnified = (params, test) => {
  const base = receiverPlan(params, test)
  const counts = faultCounts({ event: '__event', reset: params.reset }, { ...test, inputs: { ...test.inputs, __event: base.event } })
  const drive = [...base.drive]
  for (let tick = 0; tick < base.kind.length; tick++) {
    const kind = base.kind[tick]
    const before = tick === 0 || test.inputs[params.reset][tick] ? 0 : counts[tick - 1].mode
    if ((kind === 1 || kind === 2) && before === 1) {
      const start = tick + (kind === 1 ? 1 : 3)
      for (let k = start; k < start + 6 && k < drive.length; k++) drive[k] = 1
    }
  }
  return { ...base, drive, tx: counts.map((step) => step.tx), mode: counts.map((step) => step.mode) }
}

// A passive sender waiting after intermission receives a clean frame that starts during suspension.
const interruptedSuspend = ({ end }, test) => {
  const at = test.inputs[end]?.findIndex((value) => value === 1 || value === true) ?? -1
  const frame = test.bus.frames[0]
  const retry = frame ? frame.at + transmitBits(frame).length : at + 9
  const ack = frame ? frame.at + transmitBits(frame).length - 12 : -1
  const crc = ack - 1
  return {
    drive: each(test, (tick) => tick === ack ? 0 : 1),
    retry: each(test, (tick) => Number(at >= 0 && tick === retry)),
    kind: each(test, (tick) => tick === crc ? 0 : null),
    ready: each(test, (tick) => Number(tick === crc)),
    event: each(test, (tick) => tick === ack ? 4 : 0),
  }
}

const interruptedFrame = (params, test) => {
  const waiting = interruptedSuspend(params, test)
  const at = waiting.retry.findIndex((value) => value === 1)
  const pulse = test.bus.bits.map((_, tick) => Number(tick === at))
  const { bits, next } = frameTransmission({ start: '__retry' }, { ...test, inputs: { ...test.inputs, __retry: pulse } })
  return {
    drive: each(test, (tick) => at >= 0 && tick >= at ? bits[tick - at] ?? 1 : waiting.drive[tick]),
    retry: waiting.retry,
    next: each(test, (tick) => next.includes(tick)),
    done: each(test, (tick) => at >= 0 && tick === at + bits.length - 1),
  }
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

// The error that changes an active node to passive still produces an active error flag.
const transitionFlag = ({ report, ...params }, test) => {
  const modes = faultCounts(params, test)
  let flagMode = 2
  let position = 14
  return each(test, (tick) => {
    const drive = flagMode === 0 && position < 6 ? 0 : 1
    if (test.inputs[report][tick]) {
      const before = test.inputs[params.reset][tick] ? 0 : modes[tick - 1]?.mode ?? 0
      const after = modes[tick].mode
      flagMode = after === 2 ? 2 : before === 0 ? 0 : after
      position = flagMode === 2 ? 14 : 0
    } else if (position < 14) position++
    return drive
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
  transitionFlagDrive: (params) => (test) => transitionFlag(params, test),
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
  frameEof: (params) => (test) => {
    const { bits, at } = frameTransmission(params, test)
    return each(test, (tick) => Number(at >= 0 && bits.length > 0 && tick === at + bits.length - 4))
  },
  frameAckMissing: (params) => (test) => {
    const { bits, at } = frameTransmission(params, test)
    return each(test, (tick) => at >= 0 && bits.length > 0 && tick === at + bits.length - 12 ? (test.flipTicks?.includes(tick) ? 1 - test.bus.bits[tick] : test.bus.bits[tick]) === 1 : null)
  },
  arbitrationDrive: (params) => (test) => arbitration(params, test).map((step) => step.drive),
  arbitrationLost: (params) => (test) => arbitration(params, test).map((step) => step.lost),
  arbitrationLine: (params) => (test) => arbitration(params, test).map((step) => step.line),
  collisionDrive: (params) => (test) => sameIdCollision(params, test).map((step) => step.drive),
  collisionError: (params) => (test) => sameIdCollision(params, test).map((step) => step.error),
  collisionDone: (params) => (test) => sameIdCollision(params, test).map((step) => step.done),
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
  controllerDrive: (params) => (test) => controllerPlan(params, test).drive,
  controllerLost: (params) => (test) => controllerPlan(params, test).lost,
  controllerNext: (params) => (test) => controllerPlan(params, test).next,
  controllerRewind: (params) => (test) => controllerPlan(params, test).rewind,
  controllerAttempts: (params) => (test) => controllerPlan(params, test).attempts,
  controllerDone: (params) => (test) => controllerPlan(params, test).done,
  controllerTec: (params) => (test) => controllerPlan(params, test).tec,
  controllerFaultDrive: (params) => (test) => controllerPlan(params, test).drive,
  controllerFaultLost: (params) => (test) => controllerPlan(params, test).lost,
  controllerFaultNext: (params) => (test) => controllerPlan(params, test).next,
  controllerFaultRewind: (params) => (test) => controllerPlan(params, test).rewind,
  controllerFaultAttempts: (params) => (test) => controllerPlan(params, test).attempts,
  controllerFaultDone: (params) => (test) => controllerPlan(params, test).done,
  controllerFaultTec: (params) => (test) => controllerPlan(params, test).tec,
  controllerFaultError: (params) => (test) => controllerPlan(params, test).error,
  controllerAdaptiveDrive: (params) => (test) => controllerPlan(params, test).drive,
  controllerAdaptiveLost: (params) => (test) => controllerPlan(params, test).lost,
  controllerAdaptiveNext: (params) => (test) => controllerPlan(params, test).next,
  controllerAdaptiveRewind: (params) => (test) => controllerPlan(params, test).rewind,
  controllerAdaptiveAttempts: (params) => (test) => controllerPlan(params, test).attempts,
  controllerAdaptiveDone: (params) => (test) => controllerPlan(params, test).done,
  controllerAdaptiveTec: (params) => (test) => controllerPlan(params, test).tec,
  controllerAdaptiveMode: (params) => (test) => controllerPlan(params, test).mode,
  controllerAdaptiveError: (params) => (test) => controllerPlan(params, test).error,
  controllerBusoffDrive: (params) => (test) => controllerPlan(params, test).drive,
  controllerBusoffLost: (params) => (test) => controllerPlan(params, test).lost,
  controllerBusoffNext: (params) => (test) => controllerPlan(params, test).next,
  controllerBusoffRewind: (params) => (test) => controllerPlan(params, test).rewind,
  controllerBusoffAttempts: (params) => (test) => controllerPlan(params, test).attempts,
  controllerBusoffDone: (params) => (test) => controllerPlan(params, test).done,
  controllerBusoffTec: (params) => (test) => controllerPlan(params, test).tec,
  controllerBusoffMode: (params) => (test) => controllerPlan(params, test).mode,
  controllerBusoffError: (params) => (test) => controllerPlan(params, test).error,
  controllerBusoffAccepted: (params) => (test) => controllerPlan(params, test).accepted,
  controllerDuplexDrive: (params) => (test) => controllerPlan({ ...params, receive: true }, test).drive,
  controllerDuplexLost: (params) => (test) => controllerPlan({ ...params, receive: true }, test).lost,
  controllerDuplexNext: (params) => (test) => controllerPlan({ ...params, receive: true }, test).next,
  controllerDuplexRewind: (params) => (test) => controllerPlan({ ...params, receive: true }, test).rewind,
  controllerDuplexAttempts: (params) => (test) => controllerPlan({ ...params, receive: true }, test).attempts,
  controllerDuplexDone: (params) => (test) => controllerPlan({ ...params, receive: true }, test).done,
  controllerDuplexTec: (params) => (test) => controllerPlan({ ...params, receive: true }, test).tec,
  controllerDuplexRec: (params) => (test) => controllerPlan({ ...params, receive: true }, test).rec,
  controllerDuplexMode: (params) => (test) => controllerPlan({ ...params, receive: true }, test).mode,
  controllerDuplexError: (params) => (test) => controllerPlan({ ...params, receive: true }, test).error,
  controllerDuplexKind: (params) => (test) => controllerPlan({ ...params, receive: true }, test).kind,
  controllerDuplexReady: (params) => (test) => controllerPlan({ ...params, receive: true }, test).ready,
  controllerInterveningDrive: (params) => (test) => controllerPlan({ ...params, receive: true, intervening: true }, test).drive,
  controllerInterveningNext: (params) => (test) => controllerPlan({ ...params, receive: true, intervening: true }, test).next,
  controllerInterveningRewind: (params) => (test) => controllerPlan({ ...params, receive: true, intervening: true }, test).rewind,
  controllerInterveningAttempts: (params) => (test) => controllerPlan({ ...params, receive: true, intervening: true }, test).attempts,
  controllerInterveningDone: (params) => (test) => controllerPlan({ ...params, receive: true, intervening: true }, test).done,
  controllerInterveningTec: (params) => (test) => controllerPlan({ ...params, receive: true, intervening: true }, test).tec,
  controllerInterveningRec: (params) => (test) => controllerPlan({ ...params, receive: true, intervening: true }, test).rec,
  controllerInterveningMode: (params) => (test) => controllerPlan({ ...params, receive: true, intervening: true }, test).mode,
  controllerInterveningError: (params) => (test) => controllerPlan({ ...params, receive: true, intervening: true }, test).error,
  controllerInterveningKind: (params) => (test) => controllerPlan({ ...params, receive: true, intervening: true }, test).kind,
  controllerInterveningReady: (params) => (test) => controllerPlan({ ...params, receive: true, intervening: true }, test).ready,
  controllerIntegratedDrive: (params) => (test) => controllerPlan({ ...params, receive: true, intervening: true }, test).drive,
  controllerIntegratedLost: (params) => (test) => controllerPlan({ ...params, receive: true, intervening: true }, test).lost,
  controllerIntegratedNext: (params) => (test) => controllerPlan({ ...params, receive: true, intervening: true }, test).next,
  controllerIntegratedRewind: (params) => (test) => controllerPlan({ ...params, receive: true, intervening: true }, test).rewind,
  controllerIntegratedAttempts: (params) => (test) => controllerPlan({ ...params, receive: true, intervening: true }, test).attempts,
  controllerIntegratedDone: (params) => (test) => controllerPlan({ ...params, receive: true, intervening: true }, test).done,
  controllerIntegratedTec: (params) => (test) => controllerPlan({ ...params, receive: true, intervening: true }, test).tec,
  controllerIntegratedRec: (params) => (test) => controllerPlan({ ...params, receive: true, intervening: true }, test).rec,
  controllerIntegratedMode: (params) => (test) => controllerPlan({ ...params, receive: true, intervening: true }, test).mode,
  controllerIntegratedError: (params) => (test) => controllerPlan({ ...params, receive: true, intervening: true }, test).error,
  controllerIntegratedKind: (params) => (test) => controllerPlan({ ...params, receive: true, intervening: true }, test).kind,
  controllerIntegratedReady: (params) => (test) => controllerPlan({ ...params, receive: true, intervening: true }, test).ready,
  controllerIntegratedAccepted: (params) => (test) => controllerPlan({ ...params, receive: true, intervening: true }, test).accepted,
  suspendReady: (params) => (test) => suspendReady(params, test),
  suspendRequest: ({ request, ...params }) => (test) => suspendReady(params, test).map((ready, tick) => ready && Boolean(test.inputs[request][tick])),
  passiveAckDrive: (params) => (test) => passiveAckRetry(params, test).drive,
  passiveAckNext: (params) => (test) => passiveAckRetry(params, test).next,
  passiveAckRewind: (params) => (test) => passiveAckRetry(params, test).rewind,
  passiveAckAttempts: (params) => (test) => passiveAckRetry(params, test).attempts,
  passiveAckDone: (params) => (test) => passiveAckRetry(params, test).done,
  passiveAckTec: (params) => (test) => passiveAckRetry(params, test).tec,
  passiveAckMode: (params) => (test) => passiveAckRetry(params, test).mode,
  recoveryCount: (params) => (test) => busOffRecovery(params, test).map((step) => step.groups),
  recoveryReady: (params) => (test) => busOffRecovery(params, test).map((step) => step.ready),
  recoveryReset: ({ request, ...params }) => (test) => busOffRecovery(params, test).map((step, tick) => step.ready && Boolean(test.inputs[request][tick])),
  recoveryControllerTx: (params) => (test) => recoveryController(params, test).map((step) => step.tx),
  recoveryControllerRx: (params) => (test) => recoveryController(params, test).map((step) => step.rx),
  recoveryControllerMode: (params) => (test) => recoveryController(params, test).map((step) => step.mode),
  recoveryControllerAccepted: (params) => (test) => recoveryController(params, test).map((step) => step.accepted),
  receiveFrameDrive: (params) => (test) => receiverPlan(params, test).drive,
  receiveFrameKind: (params) => (test) => receiverPlan(params, test).kind,
  receiveFrameReady: (params) => (test) => receiverPlan(params, test).ready,
  receiveFrameRec: (params) => (test) => receiverPlan(params, test).rec,
  receiveFrameBad: (params) => (test) => receiverPlan(params, test).kind.map((value) => value === 1 || value === 2),
  receiveFrameEvent: (params) => (test) => receiverPlan(params, test).event,
  receiveFrameAck: (params) => (test) => receiverPlan(params, test).ack,
  receiveFrameId: (params) => (test) => receiverPlan(params, test).fields.id,
  receiveFrameLength: (params) => (test) => receiverPlan(params, test).fields.length,
  receiveFrameByte: (params) => (test) => receiverPlan(params, test).fields.byte,
  receiveStateDrive: (params) => (test) => receiveStateDrive(params, test),
  receiveUnifiedDrive: (params) => (test) => receiveUnified(params, test).drive,
  receiveUnifiedTx: (params) => (test) => receiveUnified(params, test).tx,
  receiveUnifiedMode: (params) => (test) => receiveUnified(params, test).mode,
  interruptedSuspendDrive: (params) => (test) => interruptedSuspend(params, test).drive,
  interruptedSuspendRetry: (params) => (test) => interruptedSuspend(params, test).retry,
  interruptedSuspendKind: (params) => (test) => interruptedSuspend(params, test).kind,
  interruptedSuspendReady: (params) => (test) => interruptedSuspend(params, test).ready,
  interruptedSuspendEvent: (params) => (test) => interruptedSuspend(params, test).event,
  interruptedFrameDrive: (params) => (test) => interruptedFrame(params, test).drive,
  interruptedFrameRetry: (params) => (test) => interruptedFrame(params, test).retry,
  interruptedFrameNext: (params) => (test) => interruptedFrame(params, test).next,
  interruptedFrameDone: (params) => (test) => interruptedFrame(params, test).done,
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
  frameStatus: ({ bit }) => (test) => frameStatusTrace(bit, test).status,
  frameStatusKind: ({ bit }) => (test) => frameStatusTrace(bit, test).kind,
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
