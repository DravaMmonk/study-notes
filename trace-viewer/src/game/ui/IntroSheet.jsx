import { Fragment, useEffect, useState } from 'react'
import { ArrowRight, X } from 'lucide-react'
import { NODE_TYPES } from '../engine/nodes.js'
import { INTROS, partFigure } from '../levels/intros/index.js'
import { L, tr } from '../i18n.js'
import FigureStage from './FigureStage.jsx'
import ValueView from './views/ValueView.jsx'
import { kindOf } from './views/views.js'

const INPUT_NAMES = {
  left: { zh: '左图', en: 'Left image' },
  right: { zh: '右图', en: 'Right image' },
  scene: { zh: '现场', en: 'Scene' },
  empty: { zh: '空场', en: 'Empty scene' },
}

// A level's 引入: a few pages to read before playing, each with an optional picture. It opens by
// itself the first time a level is entered and again from the bar. On a phone it is a bottom sheet,
// on a desktop a card in the middle.
export default function IntroSheet({ level, theme, onClose }) {
  const pages = INTROS[level.id] ?? []
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
          <span className="intro-kicker">{level.id} · {tr('引入', 'Intro')} {page + 1}/{pages.length}</span>
          <button className="intro-close" onClick={onClose} aria-label={tr('关闭', 'Close')}><X size={18} /></button>
        </header>
        <h2 id="intro-title">{L(level.title)}</h2>
        <div className="intro-body" key={page}>
          {current.fig && <IntroFigure fig={current.fig} level={level} theme={theme} />}
          <p className="intro-text"><Rich text={L(current.t)} /></p>
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

// Text with <b>…</b> for emphasis and nothing else.
function Rich({ text }) {
  return text.split(/(<b>.*?<\/b>)/).map((part, i) => (part.startsWith('<b>') ? <b key={i}>{part.slice(3, -4)}</b> : <Fragment key={i}>{part}</Fragment>))
}

function IntroFigure({ fig, level, theme }) {
  const caption = fig.caption && <figcaption>{L(fig.caption)}</figcaption>
  if (fig.figure) {
    return (
      <figure className="intro-figure is-art">
        <FigureStage name={fig.figure} theme={theme} />
        {caption}
      </figure>
    )
  }
  if (fig.test !== undefined) {
    const test = level.tests?.[fig.test]
    if (!test) return null
    return (
      <figure className="intro-figure">
        <div className="intro-flow">
          <Values items={Object.entries(test.inputs).map(([name, img]) => [L(level.inputLabels?.[name] ?? INPUT_NAMES[name]) ?? tr('输入', 'Input'), img])} view={fig.view} theme={theme} />
          <ArrowRight size={18} className="intro-arrow" />
          <Values items={Object.entries(test.expected).map(([name, img]) => [L(level.outputLabels?.[name]) ?? tr('期望', 'Expected'), img])} view={fig.view} theme={theme} />
        </div>
        {caption}
      </figure>
    )
  }
  if (fig.part) {
    let made = null
    try {
      made = partFigure(fig, level)
    } catch {
      return null
    }
    return (
      <figure className="intro-figure">
        <div className="intro-flow">
          {made.ins.length > 0 && <Values items={made.ins.map((img, i) => [made.ins.length > 1 ? String.fromCharCode(97 + i) : tr('输入', 'Input'), img])} view={fig.view} theme={theme} />}
          <span className="intro-part">{made.ins.length > 0 && <ArrowRight size={16} />}<b>{L(NODE_TYPES[fig.part].label)}</b><ArrowRight size={16} /></span>
          <Values items={[[tr('输出', 'Output'), made.out]]} view={fig.view} theme={theme} />
        </div>
        {caption}
      </figure>
    )
  }
  return null
}

function Values({ items, view, theme }) {
  return (
    <span className="intro-values">
      {items.map(([label, img], i) => (
        <span key={i} className="intro-value">
          <ValueView img={img} view={view} size={kindOf(img) === 'image' ? (items.length > 1 ? 64 : 84) : 120} theme={theme} />
          <small>{label}</small>
        </span>
      ))}
    </span>
  )
}
