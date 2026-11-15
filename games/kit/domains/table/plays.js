const boardLabel = { zh: '棋盘', en: 'Board' }
const frame = { boardLabel, cardClass: 'bcard', noteClass: 'bnote', afterClass: 'sg-after' }
const board = {
  icon: 'board',
  label: boardLabel,
  layout: { ...frame, board: 'stage', phoneClass: 'sg-level', desktopClass: 'sg-level', panelClass: 'panel' },
}

export const plays = {
  circuit: {
    view: 'circuit',
    judge: 'robot',
    icon: 'circuit',
    label: { zh: '电路板', en: 'Circuit board' },
    layout: { ...frame, board: 'results', phoneClass: 'sg-level is-circuit', desktopClass: 'sg-level panel-stage' },
  },
  fill: { view: 'fill', ...board },
  trace: { view: 'trace', ...board },
  link: { view: 'link', ...board },
  pack: { view: 'pack', ...board },
  breach: { view: 'breach', ...board },
  policy: { view: 'policy', ...board },
  seam: { view: 'seam', ...board },
}
