import { useState } from 'react'
import { createRoot } from 'react-dom/client'
import TopBar from './kit/shell/TopBar.jsx'
import { useLang } from './kit/shell/useLang.js'
import { tr } from './kit/shell/i18n.js'
import { currentTheme } from './kit/theme.js'

function HubBar() {
  useLang()
  const [theme, setTheme] = useState(currentTheme)
  return <TopBar theme={theme} onTheme={setTheme}>
    <a className="kit-brand" href="./index.html"><i className="kit-chip" aria-hidden="true" /><span>{tr('课程解谜', 'Course Puzzles')}</span></a>
  </TopBar>
}

export function mountHubBar(element) {
  createRoot(element).render(<HubBar />)
}
