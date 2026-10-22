// A reference to another level inside a level's text, the same in every game: authors write
//   <level-ref to="level id"></level-ref>
// in place of the level's name (never 「its title」, "the last level" or a number). It shows as a link chip, an icon,
// the level's number and its title in the reading language, both read from the game when shown (so renumbering or
// renaming a level needs no change to the text); clicking it asks the shell (GameShell) to go there, which asks the
// player first. It works wherever text is set as HTML (briefs, intros, dialogs, the encyclopedia, a domain's own
// markup); games whose text is plain render it through levelRefParts. `npm run check` checks every reference.

import { tr } from './i18n.js'

const TAG = 'level-ref'
/** A reference as it is written in a text, and a pattern that finds them. */
export const levelRef = (id) => `<${TAG} to="${id}"></${TAG}>`
export const LEVEL_REF = /<level-ref to="([^"]+)"><\/level-ref>/g

let hooks = null // { level(id) → { label, title } | null, open(id) } from the shell

const ICON = '<svg viewBox="0 0 24 24" width="12" height="12" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>'
const escape = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c])

if (typeof customElements !== 'undefined' && !customElements.get(TAG)) {
  customElements.define(TAG, class extends HTMLElement {
    constructor() {
      super()
      // The reference is a link of its own: the card or row around it does not see the click.
      this.addEventListener('click', (event) => {
        event.preventDefault()
        event.stopPropagation()
        hooks?.open(this.getAttribute('to'))
      })
    }
    connectedCallback() {
      this.render()
    }
    render() {
      const { label = '', title = this.getAttribute('to') } = hooks?.level(this.getAttribute('to')) ?? {}
      const name = `${label} ${title}`.trim()
      this.innerHTML = `<button type="button" class="level-ref" title="${escape(tr(`前往 ${name}`, `Go to ${name}`))}">${ICON}${label ? `<b>${escape(label)}</b>` : ''}<span>${escape(title)}</span></button>`
    }
  })
}

/** The shell's side: what a reference shows and what clicking it does. References already on the page redraw. */
export function setLevelRefs(next) {
  hooks = next
  if (typeof document !== 'undefined') for (const el of document.querySelectorAll(TAG)) el.render?.()
}

/** A plain text split into strings and { ref: id } pieces, for games whose text is not HTML. */
export function levelRefParts(text) {
  const out = []
  let last = 0
  for (const m of String(text).matchAll(LEVEL_REF)) {
    if (m.index > last) out.push(text.slice(last, m.index))
    out.push({ ref: m[1] })
    last = m.index + m[0].length
  }
  if (last < text.length) out.push(text.slice(last))
  return out
}
