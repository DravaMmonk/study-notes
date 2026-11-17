// Inline references use registered display metadata and shell actions.
import { tr } from './i18n.js'

const KINDS = new Set(['level', 'wiki'])
/** Every reference in a text: its kind and what it points to. */
export const REF = /<([a-z][a-z0-9-]*)-ref to="([^"]+)"><\/\1-ref>/g

let hooks = null // { name(kind, id) → { label?, title } | null, open(kind, id) } from the shell

const svg = (d) => `<svg viewBox="0 0 24 24" width="12" height="12" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`
const ICONS = {
  level: svg('<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>'),
  wiki: svg('<path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/><path d="m10 2 0 7 2.5-2 2.5 2V2"/>'),
}
const GO = { level: (n) => tr(`前往 ${n}`, `Go to ${n}`), wiki: (n) => tr(`在百科里看 ${n}`, `See ${n} in the encyclopedia`) }
const escape = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c])

function registerReference(kind, { icon = '', action = name => name } = {}) {
  KINDS.add(kind)
  if (typeof customElements !== 'undefined') {
    if (customElements.get(`${kind}-ref`)) return
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
        this.innerHTML = `<button type="button" class="ref-chip is-${kind}" title="${escape((GO[kind] ?? action)(name))}">${ICONS[kind] ?? icon}${label ? `<b>${escape(label)}</b>` : ''}<span>${escape(title)}</span></button>`
      }
    })
  }
}
for (const kind of KINDS) registerReference(kind)

/** The shell's side: what a reference shows and what clicking it does. References already on the page redraw. */
export function setRefs(next) {
  hooks = next
  for (const display of next.displays ?? []) if (display?.reference) registerReference(display.reference, display)
  if (typeof document !== 'undefined') for (const el of document.querySelectorAll([...KINDS].map((k) => `${k}-ref`).join(','))) el.render?.()
}

/** Open what a reference points at, as clicking it does (a level asks before going there). */
export const openRef = (kind, id, task) => hooks?.open(kind, id, task)

/** A plain text split into strings and { kind, ref } parts, for games whose text is not HTML. */
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
