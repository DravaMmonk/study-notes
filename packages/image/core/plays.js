import { circuitPlaySchema } from 'circuit'
import { S, TASK_BOARD_SECTIONS } from 'kernel'
import { definePlays } from 'kernel'

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
}, { ...circuitPlaySchema, workshop: S.obj({ editor: S.oneOf(['workshop']), judge: S.oneOf(['parameters', 'gridProbe']), resources: S.str(), layout: S.str(), pinOnPhone: S.bool(), taskBoard: S.opt(S.list(S.oneOf(TASK_BOARD_SECTIONS))) }) })
