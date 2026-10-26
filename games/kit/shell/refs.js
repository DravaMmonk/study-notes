// References inside a game's text, the same in every game: to a level, a part of the components box (元件箱) or an
// entry of the encyclopedia (百科). Authors write, in place of the thing's name,
//   <level-ref to="level id"></level-ref>   <part-ref to="part key"></part-ref>   <wiki-ref to="entry id"></wiki-ref>
// never 「its name」, "the last level" or a number. Each shows as a link chip: an icon, and the thing's name in the
// reading language (a level's number too), read from the game when shown, so renaming or renumbering needs no change
// to the text. Clicking one asks the shell (GameShell): a level asks before going there; a part or an entry opens the
// box or the encyclopedia at it. They work wherever text is set as HTML (briefs, intros, dialogs, the encyclopedia, a
// domain's own markup); games whose text is plain render them through refParts. `npm run check` checks every one.

import { tr } from './i18n.js'

const KINDS = ['level', 'part', 'wiki']
/** Every reference in a text: its kind and what it points to. */
export const REF = /<(level|part|wiki)-ref to="([^"]+)"><\/\1-ref>/g

let hooks = null // { name(kind, id) → { label?, title } | null, open(kind, id) } from the shell

const svg = (d) => `<svg viewBox="0 0 24 24" width="12" height="12" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`
const ICONS = {
  level: svg('<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>'),
  part: svg('<path d="M21 8 12 3 3 8v8l9 5 9-5z"/><path d="m3 8 9 5 9-5M12 13v8"/>'),
  wiki: svg('<path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/><path d="m10 2 0 7 2.5-2 2.5 2V2"/>'),
}
const GO = { level: (n) => tr(`前往 ${n}`, `Go to ${n}`), part: (n) => tr(`在元件箱里看 ${n}`, `See ${n} in the components box`), wiki: (n) => tr(`在百科里看 ${n}`, `See ${n} in the encyclopedia`) }
const escape = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c])

if (typeof customElements !== 'undefined') {
  for (const kind of KINDS) {
    if (customElements.get(`${kind}-ref`)) continue
    customElements.define(`${kind}-ref`, class extends HTMLElement {
      constructor() {
        super()
        // The reference is a link of its own: the card or row around it does not see the click.
        this.addEventListener('click', (event) => {
          event.preventDefault()
          event.stopPropagation()
          hooks?.open(kind, this.getAttribute('to'))
        })
      }
      connectedCallback() {
        this.render()
      }
      render() {
        const { label = '', title = this.getAttribute('to') } = hooks?.name(kind, this.getAttribute('to')) ?? {}
        const name = `${label} ${title}`.trim()
        this.innerHTML = `<button type="button" class="ref-chip is-${kind}" title="${escape(GO[kind](name))}">${ICONS[kind]}${label ? `<b>${escape(label)}</b>` : ''}<span>${escape(title)}</span></button>`
      }
    })
  }
}

/** The shell's side: what a reference shows and what clicking it does. References already on the page redraw. */
export function setRefs(next) {
  hooks = next
  if (typeof document !== 'undefined') for (const el of document.querySelectorAll(KINDS.map((k) => `${k}-ref`).join(','))) el.render?.()
}

/** A plain text split into strings and { kind, ref } pieces, for games whose text is not HTML. */
export function refParts(text) {
  const out = []
  let last = 0
  for (const m of String(text).matchAll(REF)) {
    if (m.index > last) out.push(text.slice(last, m.index))
    out.push({ kind: m[1], ref: m[2] })
    last = m.index + m[0].length
  }
  if (last < text.length) out.push(text.slice(last))
  return out
}
