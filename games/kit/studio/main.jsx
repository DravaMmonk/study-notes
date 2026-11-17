// The studio's page (games/DESIGN.md 6.7): the editor, or with ?play the game played inside it (an iframe of the
// same page, so a game's own styles never reach the editor's).
import { StrictMode, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import '../tokens.css'
import '../ui.css'

import { PACKAGES } from 'virtual:studio-domains'
import { registerPlugins } from '../engine/plugins.js'
import { installStudioPlugins } from './editors.js'
const entries = await Promise.all(Object.entries(PACKAGES).map(async ([id, load]) => ({ id, ...await load() })))
installStudioPlugins(await registerPlugins(entries, { view: true }))

const play = new URLSearchParams(window.location.search).has('play')
const { default: Root } = await (play ? import('./play.jsx') : import('./Studio.jsx'))
createRoot(document.getElementById('root')).render(<StrictMode>{createElement(Root)}</StrictMode>)
