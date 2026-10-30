// The CAN bus of 《车在说话》 (games/bus/DESIGN.md 2): bits on one line, 0 dominant and 1 recessive, the line dominant
// when any node says dominant. The world's frames are classic CAN data frames with 11-bit identifiers (ISO 11898-1):
// start of frame, identifier, RTR, IDE, r0, data length, data, CRC-15, then the CRC delimiter, the ACK slot (dominant:
// someone heard it), the ACK delimiter, 7 bits of end of frame and 3 of intermission. Bit stuffing runs from the start
// of frame to the end of the CRC: after five equal bits comes one of the other value, and that bit counts in the next
// run.

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
export const sayer = (id, bits) => ({ id, say: (tick) => (tick < bits.length ? bits[tick] : undefined), hear: () => null })
