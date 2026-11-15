import { definePlays } from '../../engine/plays.js'

export const plays = definePlays({
  graph: {
    editor: 'circuit',
    judge: 'outputs',
    checks: 'afterPass',
    layout: 'level-graph',
    results: { title: 'readout', body: 'row', aside: ['verdict', 'views'] },
  },
  board: { editor: 'workshop', judge: 'exercise', resources: 'parameters', layout: 'level-board', pinOnPhone: true },
  probe: { editor: 'workshop', judge: 'exercise', resources: 'probe', layout: 'level-probe', pinOnPhone: true },
})
