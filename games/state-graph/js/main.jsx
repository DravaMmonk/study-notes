import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '../../kit/tokens.css'
import '../../kit/ui.css'
import '../../kit/wires.css'
import '../../kit/shell/shell.css'
import '../styles.css'
import { GameShell } from '../../kit/shell/index.js'
import stateGraph from './game.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <GameShell game={stateGraph} />
  </StrictMode>,
)
