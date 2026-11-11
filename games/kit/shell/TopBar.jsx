import { useState } from 'react'
import { Settings } from 'lucide-react'
import { tr } from './i18n.js'
import { useLang } from './useLang.js'
import SettingsPanel from './SettingsPanel.jsx'
import './topbar.css'

export default function TopBar({ children, className = '', game, theme, onTheme }) {
  useLang()
  const [anchor, setAnchor] = useState(null)
  return <>
    <header className={`kit-bar ${className}`}>
      {children}
      <div className="kit-actions">
        <button type="button" className="kit-btn" aria-label={tr('设置')} aria-expanded={Boolean(anchor)} onClick={(event) => setAnchor(anchor ? null : event.currentTarget)}><Settings size={16} /></button>
      </div>
    </header>
    {anchor && <SettingsPanel game={game} theme={theme} onTheme={onTheme} anchor={anchor} onClose={() => setAnchor(null)} />}
  </>
}
