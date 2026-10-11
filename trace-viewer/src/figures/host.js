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

export function createFigureHost(name, theme) {
  const host = document.createElement('div')
  host.className = 'figure-host'
  host.dataset.figure = name
  const shadow = host.attachShadow({ mode: 'open' })
  const style = document.createElement('style')
  style.textContent = HOST_CSS
  const root = document.createElement('div')
  root.className = 'iso'
  root.dataset.theme = figureThemeOf(theme)
  shadow.append(style, root)

  let cleanup = () => {}
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
      cleanup = module.mount(root) ?? cleanup
    })
  }

  return {
    host,
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
