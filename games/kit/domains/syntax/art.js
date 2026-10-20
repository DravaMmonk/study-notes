// The syntax domain's picture, on the games hub's card and the level map's hero: one sentence of the first era as the
// tree the player wires, the clause's head at the top, its subject and verb phrase under it, and the sentence it says
// along the bottom. Plain SVG on the kit's tokens (games/kit/tokens.css), so it follows the page's theme.

const BOXES = [
  { x: 300, y: 104, w: 132, text: 'has + -en', tag: 'INFL', color: 'var(--w2)' },
  { x: 150, y: 178, w: 150, text: 'the committee', tag: 'SUBJ', color: 'var(--w0)' },
  { x: 440, y: 178, w: 116, text: 'approve', tag: 'VP', color: 'var(--w4)' },
  { x: 440, y: 240, w: 128, text: 'the budget', tag: 'OBJ', color: 'var(--w5)' },
]
const EDGES = [[300, 50, 300, 88], [300, 120, 150, 162], [300, 120, 440, 162], [440, 194, 440, 224]]

export function treeSVG() {
  const box = (b) => `
    <g>
      <rect x="${b.x - b.w / 2}" y="${b.y - 16}" width="${b.w}" height="32" rx="9" fill="var(--paper)" stroke="${b.color}" stroke-width="2"/>
      <text x="${b.x}" y="${b.y + 6}" text-anchor="middle" font-family="var(--serif)" font-size="17" fill="var(--ink)">${b.text}</text>
      <text x="${b.x - b.w / 2 + 2}" y="${b.y - 22}" font-family="var(--mono)" font-size="10" letter-spacing="1.4" fill="${b.color}">${b.tag}</text>
    </g>`
  return `
    <svg class="figure-host" viewBox="0 0 600 300" role="img" aria-label="The committee has approved the budget.">
      ${EDGES.map(([x1, y1, x2, y2]) => `<path d="M${x1},${y1} C${x1},${(y1 + y2) / 2} ${x2},${(y1 + y2) / 2} ${x2},${y2}" fill="none" stroke="var(--rule)" stroke-width="2"/>`).join('')}
      <circle cx="300" cy="40" r="11" fill="var(--ink)"/>
      <text x="300" y="44.5" text-anchor="middle" font-family="var(--mono)" font-size="12" fill="var(--paper)">S</text>
      ${BOXES.map(box).join('')}
      <text x="300" y="286" text-anchor="middle" font-family="var(--serif)" font-size="19" font-style="italic" fill="var(--muted)">The committee has approved the budget.</text>
    </svg>`
}

/** Draw the picture into a hub card; returns how to take it out again. */
export function mountSyntax(el) {
  el.innerHTML = treeSVG()
  return () => { el.innerHTML = '' }
}
