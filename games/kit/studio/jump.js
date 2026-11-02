// Going to a field of the form in view: the deepest field shown on the way to `path` (an item folded in a list shows
// as its list), its section unfolded if it was folded, scrolled into view, the caret put in it and the field flashed.
// A form drawn a moment after a level is selected is waited for.
import { parsePath, showPath } from '../engine/ops/edit.js'

export function focusField(path, tries = 12) {
  let keys = parsePath(path)
  let el = null
  while (!el && keys.length) {
    el = document.querySelector(`.studio-main [data-path="${CSS.escape(showPath(keys))}"]`)
    if (!el) keys = keys.slice(0, -1)
  }
  if (!el) {
    if (tries) window.setTimeout(() => focusField(path, tries - 1), 80)
    return
  }
  const folded = el.closest('.editor-section.is-folded')
  if (folded) {
    folded.querySelector('.editor-fold')?.click()
    window.setTimeout(() => focusField(path, tries), 30)
    return
  }
  el.scrollIntoView({ block: 'center' })
  el.querySelector('input, textarea, select, [contenteditable="true"], button')?.focus({ preventScroll: true })
  el.classList.remove('is-flash')
  void el.offsetWidth
  el.classList.add('is-flash')
}
