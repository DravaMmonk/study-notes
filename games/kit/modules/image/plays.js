import { definePlays } from '../../engine/plays.js'

export const plays = definePlays({
  'image:graph': {
    editor: 'circuit',
    judge: 'outputs',
    resources: 'imageCircuit',
    checks: 'afterPass',
    layout: 'level-graph',
  },
  'image:board': { editor: 'workshop', judge: 'parameters', resources: 'parameters', layout: 'level-board', pinOnPhone: true },
  'image:probe': { editor: 'workshop', judge: 'gridProbe', resources: 'probe', layout: 'level-probe', pinOnPhone: true },
})
