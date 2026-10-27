import { createElement, useEffect, useState } from 'react'
import { ArrowRight, X } from 'lucide-react'
import { L, tr } from './i18n.js'
import { Plain } from './Layout.jsx'

// A level's 引入, or a task's (`step`: its name): a few pages to read before playing, each with an optional picture
// the game draws (its IntroFigure). It opens by itself the first time and again from the bar. On a phone it is a
// bottom sheet, on a desktop a card in the middle. ← and → turn the page, Escape closes.
export default function IntroSheet({ game, level, pages, step, theme, onClose }) {
  const [page, setPage] = useState(0)
  const last = page === pages.length - 1

  useEffect(() => {
    const onKey = (event) => {
      if (event.key === 'Escape') onClose()
      if (event.key === 'ArrowRight') setPage((p) => Math.min(pages.length - 1, p + 1))
      if (event.key === 'ArrowLeft') setPage((p) => Math.max(0, p - 1))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, pages.length])

  if (!pages.length) return null
  const current = pages[page]

  return (
    <div className="intro-scrim" onClick={onClose}>
      <section className="intro-card" role="dialog" aria-modal="true" aria-labelledby="intro-title" onClick={(event) => event.stopPropagation()}>
        <header className="intro-head">
          <span className="intro-kicker">{game.levelLabel(level)} · {tr('引入', 'Intro')} {page + 1}/{pages.length}</span>
          <button className="intro-close" onClick={onClose} aria-label={tr('关闭', 'Close')}><X size={18} /></button>
        </header>
        <h2 id="intro-title">{L(level.title)}{step && <small className="intro-step">{L(step)}</small>}</h2>
        <div className="intro-body" key={page}>
          {current.fig && game.IntroFigure && createElement(game.IntroFigure, { fig: current.fig, level, theme })}
          {game.html ? <p className="intro-text" dangerouslySetInnerHTML={{ __html: String(L(current.t)) }} /> : <p className="intro-text"><Rich text={L(current.t)} /></p>}
        </div>
        <footer className="intro-foot">
          <span className="intro-dots" aria-hidden="true">{pages.map((_, i) => <i key={i} className={i === page ? 'is-on' : ''} />)}</span>
          {page > 0 && <button className="intro-back" onClick={() => setPage(page - 1)}>{tr('上一页', 'Back')}</button>}
          <button className="intro-next" onClick={() => (last ? onClose() : setPage(page + 1))}>{last ? tr('开始', 'Start') : tr('下一页', 'Next')}<ArrowRight size={15} /></button>
        </footer>
      </section>
    </div>
  )
}

// Text with <b>…</b> for emphasis and references to other levels, nothing else.
function Rich({ text }) {
  return text.split(/(<b>.*?<\/b>)/).map((part, i) => (part.startsWith('<b>') ? <b key={i}>{part.slice(3, -4)}</b> : <Plain key={i} text={part} />))
}
