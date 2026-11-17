import { S, TASK_BOARD_SECTIONS } from 'kernel'
const taskBoard = S.opt(S.list(S.oneOf(TASK_BOARD_SECTIONS)))
const label = S.obj({ zh: S.str(), en: S.str() })
const circuit = (judge, options = {}) => S.obj({
  editor: S.oneOf(['circuit']),
  judge: S.oneOf([judge]),
  resources: S.str(),
  label: S.opt(label),
  layout: S.opt(S.str()),
  results: S.opt(S.oneOf(['hidden'])),
  output: S.opt(S.oneOf(['target'])),
  tileSettings: S.opt(S.oneOf(['hidden'])),
  taskBoard,
  ...options,
})

export const circuitPlaySchema = {
  circuit: S.by('judge', {
    once: circuit('once'),
    steps: circuit('steps'),
    simulation: circuit('simulation'),
    cases: circuit('cases', { target: S.oneOf(['shown', 'hidden']) }),
    outputs: circuit('outputs', { checks: S.oneOf(['afterPass']) }),
  }),
}
