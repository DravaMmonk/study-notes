import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '../../ui/tokens.css'
import '../../ui/ui.css'
import '../../ui/prose.css'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
