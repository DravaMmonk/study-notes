import { FIGURE_CSS } from './figures.css.js'
import { figures } from './registry.js'

// Standalone preview for checking one figure in light DOM: /figures.html?fig=conv-press&theme=light&lang=en
const params = new URLSearchParams(window.location.search)
const name = params.get('fig') ?? Object.keys(figures)[0]
const theme = params.get('theme') ?? 'light'
const lang = params.get('lang') === 'en' ? 'en' : 'zh'
document.documentElement.lang = lang === 'en' ? 'en' : 'zh-CN'

const style = document.createElement('style')
style.textContent = `${FIGURE_CSS}
body{margin:0;background:var(--anatomy-page);color:var(--anatomy-text);font:14px/1.6 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
#figure-preview{width:min(720px,100% - 32px);margin:48px auto 96px}`
document.head.append(style)
document.body.classList.add('iso')
document.body.dataset.theme = theme

const module = await figures[name]()
if (module.css) {
  const extra = document.createElement('style')
  extra.textContent = module.css
  document.head.append(extra)
}
const root = document.querySelector('#figure-preview')
root.innerHTML = module.render({ lang })
module.mount(root, { lang })
