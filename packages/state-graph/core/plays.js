import { circuitPlaySchema } from 'circuit'
import { definePlays, playFor } from 'kernel'

const boardLabel = { zh: '棋盘', en: 'Board' }
const frame = { boardLabel, cardClass: 'bcard', noteClass: 'bnote', afterClass: 'sg-after' }
const hand = {
  editor: 'board',
  judge: 'hand',
  label: boardLabel,
  layout: { ...frame, phoneClass: 'sg-level', desktopClass: 'sg-level', panelClass: 'panel' },
}

export const plays = definePlays({
  'state-graph:circuit': {
    editor: 'circuit',
    judge: 'simulation',
    resources: 'robot',
    label: { zh: '电路板', en: 'Circuit board' },
    layout: 'sg-level is-circuit sg-shared-circuit',
  },
  'state-graph:fill': { ...hand, resources: 'fill' },
  'state-graph:trace': { ...hand, resources: 'trace' },
  'state-graph:link': { ...hand, resources: 'link' },
  'state-graph:pack': { ...hand, resources: 'pack' },
  'state-graph:breach': { ...hand, resources: 'breach' },
  'state-graph:policy': { ...hand, resources: 'policy' },
  'state-graph:seam': { ...hand, resources: 'seam' },
}, circuitPlaySchema)

export const playOf = (task) => playFor(plays, { kind: task.play })
