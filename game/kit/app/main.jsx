// Every game's page: the shared kit's styles and shell, around the game the page is for (virtual:game, from
// ./vite.js). A game's own styles come with its domain.
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '../tokens.css'
import '../ui.css'
import '../wires.css'
import '../shell/shell.css'
import '../circuit/circuit.css'
import { GameShell } from '../shell/index.js'
import { loadGame } from 'virtual:game'

loadGame().then((game) =>
  createRoot(document.getElementById('root')).render(
    <StrictMode>
      <GameShell game={game} />
    </StrictMode>,
  ),
)
