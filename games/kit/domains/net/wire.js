// The world of 《从一根线开始》's first era (games/network/DESIGN.md 2): point-to-point wires, a bit a tick. A wire carries
// what one end says to the other end `delay` ticks later; a wire nobody drives reads 0. The ends the board does not
// play are the world's: a sender saying a test's bits on each wire into the board, a listener decoding what the board
// says on each wire out of it. A wire may flip bits at given ticks (counted as they arrive).
//
// What the far ends say and understand is a format, a way of putting bytes on a wire as bits (the most significant bit
// first everywhere):
//
//   bytes      eight bits a byte, back to back
//   startstop  each byte as a start bit 1, its eight bits, a stop bit 0; the wire idles at 0 between them
//   parity     each byte followed by a parity bit making its count of ones even, back to back
//   check      each byte followed by its check bits: the remainder of the byte divided by the generator (CRC)
//   blocks     each 4-bit block followed by its check bits (with 1011: a Hamming code that can correct one flip)
//   flag       a frame: the flag 01111110, its bytes with a 0 put in after every five 1s in a row, the flag again
//   flagcheck  a frame as flag does, its bytes followed by their check bits before the closing flag
//   flagbyte   a frame as flag does, its bytes followed by one more byte: their check bits, with 0s before them to
//              make 8 (so the frame stays whole bytes)
//
// encode(format, frames, poly) → bits; decode(format, bits, poly) → events [{ at (the tick of the last bit), byte } |
// { at, end: true, intact }]: what a far end makes of a run of bits.

export const FORMATS = ['bytes', 'startstop', 'parity', 'check', 'blocks', 'flag', 'flagcheck', 'flagbyte']
export const FLAG = [0, 1, 1, 1, 1, 1, 1, 0]
const POLY = '1011'

/** The bits of `n`, `width` of them, the most significant first. */
export const bitsOf = (n, width = 8) => Array.from({ length: width }, (_, k) => (n >> (width - 1 - k)) & 1)
const numberOf = (bits) => bits.reduce((n, b) => n * 2 + b, 0)

/** The carry-less remainder of `bits` divided by the generator `poly` ('1011'), as bits (one fewer than the generator). */
export function remainder(bits, poly = POLY) {
  const g = [...poly].map(Number)
  const r = [...bits]
  for (let k = 0; k + g.length <= r.length; k++) if (r[k]) g.forEach((b, j) => { r[k + j] ^= b })
  return r.slice(-(g.length - 1))
}
/** The check bits of a message: the remainder of the message with room made for them. */
export const checkOf = (bits, poly = POLY) => remainder([...bits, ...Array(poly.length - 1).fill(0)], poly)

/** Bits with a 0 put in after every five 1s in a row. */
export function stuff(bits) {
  const out = []
  let ones = 0
  for (const b of bits) {
    out.push(b)
    ones = b ? ones + 1 : 0
    if (ones === 5) {
      out.push(0)
      ones = 0
    }
  }
  return out
}

/** A frame's bits as `format` puts it on the wire (frames: lists of bytes; formats of single bytes take each byte). */
export function encode(format, frames, poly = POLY) {
  const bytes = frames.flat()
  const width = poly.length - 1
  switch (format) {
    case 'bytes': return bytes.flatMap((b) => bitsOf(b))
    case 'startstop': return bytes.flatMap((b) => [1, ...bitsOf(b), 0])
    case 'parity': return bytes.flatMap((b) => [...bitsOf(b), bitsOf(b).reduce((x, y) => x ^ y, 0)])
    case 'check': return bytes.flatMap((b) => [...bitsOf(b), ...checkOf(bitsOf(b), poly)])
    case 'blocks': return bytes.flatMap((b) => [...bitsOf(b, 4), ...checkOf(bitsOf(b, 4), poly)])
    case 'flag': return frames.flatMap((f) => [...FLAG, ...stuff(f.flatMap((b) => bitsOf(b))), ...FLAG])
    case 'flagcheck': return frames.flatMap((f) => {
      const body = f.flatMap((b) => bitsOf(b))
      return [...FLAG, ...stuff([...body, ...checkOf(body, poly)]), ...FLAG]
    })
    case 'flagbyte': return frames.flatMap((f) => {
      const body = f.flatMap((b) => bitsOf(b))
      return [...FLAG, ...stuff([...body, ...Array(8 - width).fill(0), ...checkOf(body, poly)]), ...FLAG]
    })
    default: throw new Error(`no format ${format} (width ${width})`)
  }
}

/**
 * What a far end decodes from `bits` (0 for nothing said): bytes on the tick their last bit arrives; for the flag
 * formats, a frame's bytes on the tick its closing flag ends, then its end ({ end, intact }: for flag every frame is
 * intact, for flagcheck when its check bits fit). blocks gives each corrected 4-bit block.
 */
export function decode(format, bits, poly = POLY) {
  const b = bits.map((x) => (x === 1 ? 1 : 0))
  const out = []
  const width = poly.length - 1
  const fixed = (size, f) => {
    for (let at = size - 1; at < b.length; at += size) out.push({ at, ...f(b.slice(at - size + 1, at + 1)) })
  }
  switch (format) {
    case 'bytes': fixed(8, (x) => ({ byte: numberOf(x) })); break
    case 'parity': fixed(9, (x) => ({ byte: numberOf(x.slice(0, 8)), intact: x.reduce((p, y) => p ^ y, 0) === 0 })); break
    case 'check': fixed(8 + width, (x) => ({ byte: numberOf(x.slice(0, 8)), intact: remainder(x, poly).every((y) => !y) })); break
    case 'blocks': fixed(4 + width, (x) => ({ byte: numberOf(corrected(x, poly).slice(0, 4)) })); break
    case 'startstop': {
      for (let k = 0; k < b.length; k++) {
        if (!b[k]) continue
        if (k + 9 >= b.length) break
        out.push({ at: k + 8, byte: numberOf(b.slice(k + 1, k + 9)), intact: b[k + 9] === 0 })
        k += 9
      }
      break
    }
    case 'flag':
    case 'flagcheck':
    case 'flagbyte': {
      let open = null
      for (let k = 7; k < b.length; k++) {
        if (FLAG.every((x, j) => b[k - 7 + j] === x)) {
          if (open !== null && k - 7 > open) {
            const body = unstuff(b.slice(open, k - 7))
            const tail = { flag: 0, flagcheck: width, flagbyte: 8 }[format]
            const content = body.slice(0, Math.max(0, body.length - tail))
            const check = body.slice(content.length)
            const intact = content.length % 8 === 0 && body.length >= tail && (format === 'flag'
              || (format === 'flagcheck' && remainder(body, poly).every((y) => !y))
              || (format === 'flagbyte' && check.join('') === [...Array(8 - width).fill(0), ...checkOf(content, poly)].join('')))
            for (let j = 0; j + 8 <= content.length; j += 8) out.push({ at: k, byte: numberOf(content.slice(j, j + 8)) })
            out.push({ at: k, end: true, intact })
            open = null
          } else open = k + 1
        }
      }
      break
    }
    default: throw new Error(`no format ${format}`)
  }
  return out
}

/** Bits with the 0 after every five 1s in a row taken out. */
export function unstuff(bits) {
  const out = []
  let ones = 0
  for (let k = 0; k < bits.length; k++) {
    out.push(bits[k])
    ones = bits[k] ? ones + 1 : 0
    if (ones === 5) {
      k++
      ones = 0
    }
  }
  return out
}

/** A block with its check bits, the one flip corrected that makes the remainder 0 (if any does). */
function corrected(block, poly) {
  if (remainder(block, poly).every((y) => !y)) return block
  for (let k = 0; k < block.length; k++) {
    const flipped = block.map((x, j) => (j === k ? 1 - x : x))
    if (remainder(flipped, poly).every((y) => !y)) return flipped
  }
  return block
}

/**
 * The bits a sender says on a wire, from a test's segments: { idle: n } quiet ticks, { bits: '0110' }, or { bytes,
 * format, frames?, poly? } (bytes as one frame; frames as several).
 */
export function said(segments) {
  return segments.flatMap((s) => {
    if (s.idle !== undefined) return Array(s.idle).fill(0)
    if (s.bits !== undefined) return [...s.bits].map(Number)
    return encode(s.format, s.frames ?? [s.bytes], s.poly)
  })
}

/** What arrives at the far end of a wire: what was said, `delay` ticks later, flipped at the ticks `flips` names. */
export function arrived(bits, { delay = 0, flips = [] } = {}, ticks = bits.length + delay) {
  const flipped = new Set(flips)
  return Array.from({ length: ticks }, (_, t) => {
    const b = t >= delay ? bits[t - delay] ?? 0 : 0
    return flipped.has(t) ? 1 - b : b
  })
}
