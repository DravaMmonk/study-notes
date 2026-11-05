// Every game's page: the shared kit's styles and shell, around the game the page is for. The page is its domain's
// code (virtual:game, from ./vite.js); the content it plays is read when the page opens (content.json beside it) and
// checked against the domain's vocabulary first: content that does not fit is shown as what is wrong with it, never
// handed to the domain.
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '../tokens.css'
import '../ui.css'
import '../wires.css'
import '../shell/shell.css'
import '../circuit/circuit.css'
import { GameShell } from '../shell/index.js'
import { checkContent } from '../engine/vocabulary.js'
import { tr } from '../shell/i18n.js'
import { loadDomain } from 'virtual:game'

/** What is wrong with the content the page read, one problem a line. */
function Unreadable({ problems }) {
  return (
    <main className="content-problems">
      <h1>{tr('这款游戏的内容读不进来', 'This game’s content cannot be read')}</h1>
      <ul>{problems.map((p, k) => <li key={k}><code>{p}</code></li>)}</ul>
    </main>
  )
}

async function open() {
  const [{ define, vocabulary }, response] = await Promise.all([loadDomain(), fetch(new URL('content.json', window.location.href), { cache: 'no-store' })])
  if (!response.ok) return <Unreadable problems={[`content.json: ${response.status} ${response.statusText}`]} />
  const content = await response.json()
  const problems = checkContent({ vocabulary }, content).map((p) => `${p.at}: ${p.says}`)
  return problems.length ? <Unreadable problems={problems} /> : <GameShell game={define(content)} />
}

open().then((page) => createRoot(document.getElementById('root')).render(<StrictMode>{page}</StrictMode>))
