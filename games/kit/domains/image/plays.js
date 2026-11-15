const bench = { view: 'workshop', icon: 'bench', label: { zh: '机关台', en: 'Bench' } }

export const plays = {
  graph: {
    view: 'circuit',
    icon: 'circuit',
    label: { zh: '搭电路', en: 'Build a circuit' },
    checks: { hidden: 'afterPass' },
    layout: {
      className: 'level-graph',
      canvasWidth: 140,
      dense: false,
      results: { title: 'readout', body: 'row', aside: ['verdict', 'views'] },
    },
  },
  board: { ...bench, content: 'parameters', layout: { className: 'level-board', pinOnPhone: true } },
  probe: { ...bench, content: 'probe', layout: { className: 'level-probe', pinOnPhone: true } },
}
