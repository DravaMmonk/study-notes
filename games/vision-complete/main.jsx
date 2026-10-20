import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '../kit/tokens.css'
import '../kit/ui.css'
import '../kit/wires.css'
import '../kit/shell/shell.css'
import '../kit/circuit/circuit.css'
import '../../trace-viewer/src/index.css'
import '../kit/domains/image/image.css'
import '../kit/domains/image/ui/boards/kit.css'
import { GameShell } from '../kit/shell/index.js'
import visionComplete from './game.js'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <GameShell game={visionComplete} />
  </StrictMode>,
)
