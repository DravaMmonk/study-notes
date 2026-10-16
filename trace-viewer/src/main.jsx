import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '../../games/kit/tokens.css'
import '../../games/kit/ui.css'
import '../../games/kit/prose.css'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
