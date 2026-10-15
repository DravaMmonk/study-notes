import { FIGURE_CSS } from './figures.css.js'
import { figures } from './registry.js'

// Figures live in a shadow root: their readouts and captions stay out of the article's text, so
// annotation offsets, selections and search never see them, and the reading styles never leak in.
const HOST_CSS = `${FIGURE_CSS}
:host{display:block;margin:40px 0 44px;font:14px/1.6 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
.iso{color:var(--anatomy-text);background:transparent}
.figure-missing{padding:18px;color:var(--anatomy-muted);font:12px var(--anatomy-mono);box-shadow:0 0 0 1px var(--anatomy-faint)}
@media (max-width:560px){.iso-plate{overflow:hidden}.iso-plate .iso-svg{width:118%;margin-left:-9%}}`

export const figureThemeOf = (theme) => ({ night: 'dark', blueprint: 'blueprint' })[theme] ?? 'light'

// `bare` drops the card frame, corner labels and legend, for using a figure as illustration.
const BARE_CSS = `:host{margin:0}.iso-plate{padding:0;background:transparent;box-shadow:none}.iso-plate-corners,.iso-legend{display:none}.iso-stage{cursor:default}`
// `stage` is a bare figure the reader plays with: it keeps its own cursors and is never cropped on phones.
const STAGE_CSS = `.iso-stage{cursor:auto}@media (max-width:560px){.iso-plate .iso-svg{width:100%;margin-left:0}}`

// A figure's mount(root, { props, emit }) may return a cleanup function or { update(props), destroy() }.
// `props` go in at mount and with update(); `onChange` hears what the reader changed inside the figure.
export function createFigureHost(name, theme, { bare = false, stage = false, props, onChange } = {}) {
  const host = document.createElement('div')
  host.className = 'figure-host'
  host.dataset.figure = name
  const shadow = host.attachShadow({ mode: 'open' })
  const style = document.createElement('style')
  style.textContent = HOST_CSS + (bare || stage ? BARE_CSS : '') + (stage ? STAGE_CSS : '')
  const root = document.createElement('div')
  root.className = 'iso'
  root.dataset.theme = figureThemeOf(theme)
  shadow.append(style, root)

  let cleanup = () => {}
  let update = () => {}
  let latest = props
  let disposed = false
  const load = figures[name]
  if (!load) {
    root.innerHTML = `<div class="figure-missing">Unknown figure: ${name.replace(/[<>&"]/g, '')}</div>`
  } else {
    load().then((module) => {
      if (disposed) return
      if (module.css) {
        const extra = document.createElement('style')
        extra.textContent = module.css
        shadow.insertBefore(extra, root)
      }
      root.innerHTML = module.render()
      const mounted = module.mount(root, { props: latest, emit: onChange })
      if (typeof mounted === 'function') cleanup = mounted
      else if (mounted) {
        cleanup = () => mounted.destroy?.()
        update = (next) => mounted.update?.(next)
      }
    })
  }

  return {
    host,
    update(next) {
      latest = next
      update(next)
    },
    setTheme(next) {
      root.dataset.theme = figureThemeOf(next)
    },
    dispose() {
      disposed = true
      cleanup()
      host.remove()
    },
  }
}
