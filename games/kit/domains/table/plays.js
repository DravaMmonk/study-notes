import { definePlays, playFor } from '../../engine/plays.js'

const boardLabel = { zh: '棋盘', en: 'Board' }
const frame = { boardLabel, cardClass: 'bcard', noteClass: 'bnote', afterClass: 'sg-after' }
const hand = {
  editor: 'board',
  judge: 'hand',
  label: boardLabel,
  layout: { ...frame, board: 'stage', phoneClass: 'sg-level', desktopClass: 'sg-level', panelClass: 'panel' },
}

export const plays = definePlays({
  circuit: {
    editor: 'board',
    judge: 'robot',
    resources: 'circuit',
    label: { zh: '电路板', en: 'Circuit board' },
    layout: { ...frame, board: 'results', phoneClass: 'sg-level is-circuit', desktopClass: 'sg-level panel-stage' },
  },
  fill: { ...hand, resources: 'fill' },
  trace: { ...hand, resources: 'trace' },
  link: { ...hand, resources: 'link' },
  pack: { ...hand, resources: 'pack' },
  breach: { ...hand, resources: 'breach' },
  policy: { ...hand, resources: 'policy' },
  seam: { ...hand, resources: 'seam' },
})

export const playOf = (task) => playFor(plays, { kind: task.mode })
