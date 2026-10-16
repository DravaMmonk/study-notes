import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '../../../games/kit/tokens.css'
import '../../../games/kit/ui.css'
import '../../../games/kit/wires.css'
import '../../../games/kit/shell/shell.css'
import '../../../games/kit/circuit/circuit.css'
import '../index.css'
import './game.css'
import './ui/boards/kit.css'
import { GameShell } from '../../../games/kit/shell/index.js'
import visionComplete from './game.js'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <GameShell game={visionComplete} />
  </StrictMode>,
)
