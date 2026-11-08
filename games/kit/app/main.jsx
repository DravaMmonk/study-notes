// Every game's page: the shared kit's styles and shell, around the game the page is for. The page is its domain's
// code (virtual:game, from ./vite.js); the content it plays is read when the page opens (content.json beside it) and
// checked against the domain's vocabulary first: content that does not fit is shown as what is wrong with it, never
// handed to the domain. A domain never writes into its content: on the dev server the page reads it frozen.
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '../tokens.css'
import '../ui.css'
import '../wires.css'
import '../shell/shell.css'
import '../views/views.css'
import '../circuit/circuit.css'
import { GameShell } from '../shell/index.js'
import { createProgress } from '../shell/progress.js'
import { contentStamp } from '../engine/stamp.js'
import { checkContent } from '../engine/vocabulary.js'
import { deepFreeze } from '../engine/content.js'
import { loadDomain } from 'virtual:game'
import { assetSignature, cleanRefreshURL } from './release.js'
import { ReleaseWatch, Unreadable } from './ReleaseWatch.jsx'

const loadedAssets = assetSignature(document, window.location.href)

async function open() {
  const [{ define, vocabulary }, response] = await Promise.all([loadDomain(), fetch(new URL('content.json', window.location.href), { cache: 'no-store' })])
  if (!response.ok) return { page: <Unreadable problems={[`content.json: ${response.status} ${response.statusText}`]} />, content: null }
  // On the dev server the content is frozen, so a domain that writes into it fails at once (its checks read it so too).
  const contentText = await response.text()
  const parsed = JSON.parse(contentText)
  const content = import.meta.env.DEV ? deepFreeze(parsed) : parsed
  const problems = checkContent({ vocabulary }, content).map((p) => `${p.at}: ${p.says}`)
  if (problems.length) return { page: <Unreadable problems={problems} />, content: contentText }
  return { page: <GameShell game={define(content)} store={createProgress({ id: content.id, stamp: contentStamp(vocabulary, content) })} />, content: contentText }
}


if (new URL(window.location.href).searchParams.has('_refresh')) window.history.replaceState(window.history.state, '', cleanRefreshURL(window.location.href))
open().catch((error) => ({ page: <Unreadable problems={[String(error)]} />, content: null })).then(({ page, content }) => createRoot(document.getElementById('root')).render(<StrictMode><ReleaseWatch page={page} content={content} loadedAssets={loadedAssets} /></StrictMode>))
