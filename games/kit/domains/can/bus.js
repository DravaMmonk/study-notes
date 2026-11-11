// The CAN bus of 《车在说话》 (games/bus/DESIGN.md 2): bits on one line, 0 dominant and 1 recessive, the line dominant
// when any node says dominant. The world's frames are classic CAN data frames with 11-bit identifiers (ISO 11898-1):
// start of frame, identifier, RTR, IDE, r0, data length, data, CRC-15, then the CRC delimiter, the ACK slot (dominant:
// someone heard it), the ACK delimiter, 7 bits of end of frame and 3 of intermission. Bit stuffing runs from the start
// of frame to the end of the CRC: after five equal bits comes one of the other value, and that bit counts in the next
// run.
import { T } from '../../shell/i18n.js'

/** The line made of what the nodes said: dominant (0) when anyone says it, recessive (1) when nobody does. */
export const wiredAnd = (said) => (said.some((v) => v === 0) ? 0 : 1)

/** The bits of `n`, `width` of them, the most significant first. */
export const bitsOf = (n, width) => Array.from({ length: width }, (_, k) => (n >> (width - 1 - k)) & 1)

/** CRC-15 of a run of bits (generator x^15 + x^14 + x^10 + x^8 + x^7 + x^4 + x^3 + 1, 0x4599), as a number. */
export function crc15(bits) {
  let crc = 0
  for (const bit of bits) {
    const top = (crc >> 14) & 1
    crc = (crc << 1) & 0x7fff
    if (bit ^ top) crc ^= 0x4599
  }
  return crc
}

/** Bits with a stuff bit after every five equal ones. */
export function stuff(bits) {
  const out = []
  let run = 0
  let last = null
  for (const bit of bits) {
    out.push(bit)
    run = bit === last ? run + 1 : 1
    last = bit
    if (run === 5) {
      out.push(1 - bit)
      last = 1 - bit
      run = 1
    }
  }
  return out
}

/** The bits a frame puts on the bus, from its start of frame to the end of its intermission. */
export function frameBits({ id, data = [] }) {
  const head = [0, ...bitsOf(id, 11), 0, 0, 0, ...bitsOf(data.length, 4), ...data.flatMap((b) => bitsOf(b, 8))]
  return [...stuff([...head, ...bitsOf(crc15(head), 15)]), 1, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]
}

/** What a transmitter itself says: it releases the ACK slot. */
export function transmitBits(frame) {
  const bits = frameBits(frame)
  bits[bits.length - 12] = 1
  return bits
}

/** Number of physical bits through the standard frame's arbitration field, including stuffing. */
export const arbitrationLength = (id) => stuff([0, ...bitsOf(id, 11), 0]).length

/** A scripted sender that withdraws on arbitration loss, after sampling the shared line. */
export function contender(id, frame, at = 0) {
  const bits = transmitBits(frame)
  const end = arbitrationLength(frame.id)
  let active = true
  let errorAt = null
  return {
    id,
    say: (tick) => errorAt !== null ? (tick > errorAt && tick <= errorAt + 6 ? 0 : 1) : active && tick >= at ? bits[tick - at] ?? 1 : 1,
    hear: (tick, line) => {
      const offset = tick - at
      if (active && offset >= 0 && offset < end && bits[offset] === 1 && line === 0) active = false
      else if (frame.detectErrors && active && errorAt === null && offset >= end && offset < bits.length && offset !== bits.length - 12 && bits[offset] !== line) errorAt = tick
      return null
    },
  }
}

/**
 * A stretch of bus: `idle` recessive bits, then each frame after the gap before it (`gap`, recessive bits beyond the
 * intermission), then `tail` recessive bits. Returns { bits, frames: [{ id, data, at }] } (at: the tick of its start
 * of frame).
 */
export function busOf({ idle = 12, frames = [], tail = 4 }) {
  const bits = Array(idle).fill(1)
  const placed = frames.map((f) => {
    bits.push(...Array(f.gap ?? 0).fill(1))
    const at = bits.length
    bits.push(...frameBits(f))
    return { id: f.id, data: f.data ?? [], at }
  })
  bits.push(...Array(tail).fill(1))
  return { bits, frames: placed }
}

/** A node of the world saying a run of bits, one a tick (recessive once they run out: it says nothing). */
/** The bus, as the card that hears it and the results name it. */
export const BUS = T('总线')

export const sayer = (id, bits) => ({ id, say: (tick) => (tick < bits.length ? bits[tick] : undefined), hear: () => null })

/** What a bus game calls its tests: each is a bus, its frames on the line (../../engine/circuit-domain.js TEST_WORDS). */
export const BUS_WORDS = {
  label: (k) => T(`总线 ${k + 1}`, `Bus ${k + 1}`),
  note: (n) => T(`另有 ${n} 条隐藏的总线，每次运行一并检查，通关后公开。`, `${n} more hidden ${n === 1 ? 'bus is' : 'buses are'} checked with every run and shown once you pass.`),
  failed: (fails, n) => T(`可见的总线全部通过，但 ${n} 条隐藏的总线中有 ${fails} 条没有通过：这块板可能只是恰好合上了这几条总线。`, `Every bus shown passes, but ${fails} of ${n} hidden ${n === 1 ? 'bus fails' : 'buses fail'}: the board may only happen to fit these.`),
}
