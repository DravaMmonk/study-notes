// Seeds for the random draws of a run. A verdict is a pure function of the content, the task and the board
// (games/DIRECTION.md, decision 13), so nothing a part, a world or a bench model computes reads a clock or an unseeded
// random source: a part that draws takes its seed from what it was given.

/** A 32-bit seed from `parts`: strings, numbers, or lists of numbers (FNV-1a over their text). */
export function seedOf(...parts) {
  let h = 0x811c9dc5
  const eat = (text) => { for (let k = 0; k < text.length; k++) h = Math.imul(h ^ text.charCodeAt(k), 0x01000193) }
  for (const part of parts) {
    eat(typeof part === 'string' || typeof part === 'number' ? String(part) : Array.from(part).join(','))
    eat('|')
  }
  return h >>> 0
}
