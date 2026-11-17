import { circuitPlaySchema } from '../../../../packages/circuit/core/index.js'
import { definePlays, playFor } from '../../engine/plays.js'

const boardLabel = { zh: '棋盘', en: 'Board' }
const frame = { boardLabel, cardClass: 'bcard', noteClass: 'bnote', afterClass: 'sg-after' }
const hand = {
  editor: 'board',
  judge: 'hand',
  label: boardLabel,
  layout: { ...frame, phoneClass: 'sg-level', desktopClass: 'sg-level', panelClass: 'panel' },
}

export const plays = definePlays({
  'table:circuit': {
    editor: 'circuit',
    judge: 'simulation',
    resources: 'robot',
    label: { zh: '电路板', en: 'Circuit board' },
    layout: 'sg-level is-circuit sg-shared-circuit',
  },
  'table:fill': { ...hand, resources: 'fill' },
  'table:trace': { ...hand, resources: 'trace' },
  'table:link': { ...hand, resources: 'link' },
  'table:pack': { ...hand, resources: 'pack' },
  'table:breach': { ...hand, resources: 'breach' },
  'table:policy': { ...hand, resources: 'policy' },
  'table:seam': { ...hand, resources: 'seam' },
}, circuitPlaySchema)

export const playOf = (task) => playFor(plays, { kind: task.mode })
