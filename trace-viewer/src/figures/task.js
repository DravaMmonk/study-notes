// A level of a notes edition (games/DESIGN.md 12.1) where a note writes <!-- task: <game>/<namespace>/<level> --> on its own line:
// the game's own page, embedded (?embed, games/kit/shell/EmbedShell.jsx in the games repository), as tall as the page tells it it is. The page
// follows the reader's theme through the shared storage key, and reads in the note's language.
const HEIGHT = 'kit-embed-height'
// The games live in their own repository and are read from the published site, as the notes site does (mkdocs.yml extra.games).
const GAMES = 'https://dravammonk.github.io/games/'

export function createTaskHost(game, level, { lang = 'zh' } = {}) {
  const host = document.createElement('iframe')
  host.className = 'task-embed'
  host.title = `${game} · ${level}`
  host.loading = 'lazy'
  host.src = `${GAMES}${encodeURIComponent(game)}/index.html?${new URLSearchParams({ embed: '', level, lang: lang === 'en' ? 'en' : 'zh' })}`
  const onMessage = (event) => {
    if (event.source !== host.contentWindow || event.data?.kit !== HEIGHT) return
    host.style.height = `${event.data.height}px`
  }
  window.addEventListener('message', onMessage)
  return {
    host,
    setTheme() {},
    dispose() {
      window.removeEventListener('message', onMessage)
      host.remove()
    },
  }
}
