// The syntax domain's picture, on the games hub's card and the level map's hero: one sentence of the first era as
// the player builds it, a row of places in reading order (subject, then the predicate's tense, verb and object)
// with the brackets that group them underneath. Plain SVG on the kit's tokens (games/kit/tokens.css), so it follows
// the page's theme.

const SLOTS = [
  { x: 22, w: 150, text: 'The committee', tag: 'subject', color: 'var(--w0)' },
  { x: 184, w: 64, text: 'has', tag: 'tense', color: 'var(--w2)' },
  { x: 260, w: 116, text: 'accepted', tag: 'verb', color: 'var(--w4)' },
  { x: 388, w: 120, text: 'the paper', tag: 'object', color: 'var(--w5)' },
]
const BRACKETS = [
  { x1: 22, x2: 172, y: 150, text: 'subject' },
  { x1: 184, x2: 508, y: 150, text: 'predicate' },
  { x1: 22, x2: 508, y: 196, text: 'clause' },
]

export function treeSVG() {
  const slot = (s) => `
    <rect x="${s.x}" y="70" width="${s.w}" height="48" rx="11" fill="var(--paper)" stroke="${s.color}" stroke-width="2"/>
    <rect x="${s.x + 1}" y="113" width="${s.w - 2}" height="4" rx="2" fill="${s.color}"/>
    <text x="${s.x + s.w / 2}" y="101" text-anchor="middle" font-family="var(--serif)" font-size="19" fill="var(--ink)">${s.text}</text>`
  const bracket = (b) => `
    <path d="M${b.x1 + 4},${b.y - 10} V${b.y - 4} Q${b.x1 + 4},${b.y} ${b.x1 + 9},${b.y} H${b.x2 - 9} Q${b.x2 - 4},${b.y} ${b.x2 - 4},${b.y - 4} V${b.y - 10}" fill="none" stroke="var(--rule)" stroke-width="1.6"/>
    <text x="${(b.x1 + b.x2) / 2}" y="${b.y + 18}" text-anchor="middle" font-family="var(--mono)" font-size="11" letter-spacing="1.5" fill="var(--muted)">${b.text.toUpperCase()}</text>`
  return `
    <svg class="figure-host" viewBox="0 0 530 260" role="img" aria-label="The committee has accepted the paper.">
      ${SLOTS.map(slot).join('')}
      ${BRACKETS.map(bracket).join('')}
      <text x="265" y="246" text-anchor="middle" font-family="var(--serif)" font-size="16" font-style="italic" fill="var(--muted)">The committee has accepted the paper.</text>
    </svg>`
}

/** Draw the picture into a hub card; returns how to take it out again. */
export function mountSyntax(el) {
  el.innerHTML = treeSVG()
  return () => { el.innerHTML = '' }
}
