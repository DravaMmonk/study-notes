import { definePlays } from '../../engine/plays.js'

export const plays = definePlays({
  graph: {
    editor: 'circuit',
    judge: 'outputs',
    resources: 'imageCircuit',
    checks: 'afterPass',
    layout: 'level-graph',
  },
  board: { editor: 'workshop', judge: 'parameters', resources: 'parameters', layout: 'level-board', pinOnPhone: true },
  probe: { editor: 'workshop', judge: 'gridProbe', resources: 'probe', layout: 'level-probe', pinOnPhone: true },
})
