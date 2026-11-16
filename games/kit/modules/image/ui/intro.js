import { createElement } from 'react'
import { createFigureHost } from '../../../../../trace-viewer/src/figures/host.js'
import { figureTask, figureTest, partFigure } from '../intros.js'
import { WORDS } from '../../../shell/words.js'
import IntroFigure, { FigureHost } from '../../../shell/IntroFigure.jsx'

const INPUT = { zh: '输入', en: 'Input' }
const OUTPUT = { zh: '输出', en: 'Output' }
const INPUT_NAMES = {
  left: { zh: '左图', en: 'Left image' },
  right: { zh: '右图', en: 'Right image' },
  scene: { zh: '现场', en: 'Scene' },
  empty: { zh: '空场', en: 'Empty scene' },
}

const item = (label, image, view) => image.w * image.h === 1 && (image.c ?? 1) === 1
  ? { label, value: image.data[0] }
  : { label, value: image, views: [view ? ({ 'image:view-pixels': 'pixels', 'image:view-terrain': 'surface', 'image:view-slope': 'slope', 'image:view-profile': 'profile', 'image:view-spectrum': 'spectrum' })[view] : (image.h === 1 ? 'plot' : 'pixels'), 'pixels'] }

export function imageHero({ theme }) {
  return createElement(FigureHost, { mount: createFigureHost, name: 'conv-press', theme, bare: true })
}

export function imageIntroduction({ fig, level, theme, types }) {
  const { caption, view } = fig
  if (fig.figure) return createElement(IntroFigure, { caption, art: createElement(FigureHost, { mount: createFigureHost, name: fig.figure, theme }) })
  if (fig.test !== undefined) {
    const test = figureTest(fig, level)
    if (!test) return null
    const task = figureTask(fig, level)
    const inputs = Object.entries(test.inputs).map(([name, image]) => item(task.inputLabels?.[name] ?? INPUT_NAMES[name] ?? INPUT, image, view))
    const outputs = Object.entries(test.expected).map(([name, image]) => item(task.outputLabels?.[name] ?? WORDS.wanted, image, view))
    return createElement(IntroFigure, { caption, inputs, outputs })
  }
  if (!fig.part) return null
  try {
    const made = partFigure(fig, level, types)
    const inputs = made.ins.map((image, index) => item(made.ins.length > 1 ? String.fromCharCode(97 + index) : INPUT, image, view))
    return createElement(IntroFigure, { caption, inputs, part: types[fig.part].label, outputs: [item(OUTPUT, made.out, view)] })
  } catch {
    return null
  }
}
