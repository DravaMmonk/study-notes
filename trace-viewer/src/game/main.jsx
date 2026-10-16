import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '../../../games/kit/tokens.css'
import '../../../games/kit/ui.css'
import '../../../games/kit/wires.css'
import '../index.css'
import './game.css'
import './ui/boards/kit.css'
import Game from './Game.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Game />
  </StrictMode>,
)
