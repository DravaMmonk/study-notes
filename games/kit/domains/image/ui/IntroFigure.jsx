import { ArrowRight } from 'lucide-react'
import { NODE_TYPES } from '../engine/nodes.js'
import { figureTest, partFigure } from '../intros.js'
import { L, tr } from '../../../shell/i18n.js'
import FigureStage from './FigureStage.jsx'
import ValueView from './views/ValueView.jsx'
import { kindOf } from './views/views.js'

const INPUT_NAMES = {
  left: { zh: '左图', en: 'Left image' },
  right: { zh: '右图', en: 'Right image' },
  scene: { zh: '现场', en: 'Scene' },
  empty: { zh: '空场', en: 'Empty scene' },
}

// The picture on a page of a Vision Complete 引入 (the shell's IntroSheet draws the page around it): a figure from
// the notes, a test's input and expected output, or a part between an input and its output.
export default function IntroFigure({ fig, level, theme }) {
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
    const test = figureTest(fig, level)
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
