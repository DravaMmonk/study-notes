import { circuitPlaySchema } from '../../../../packages/circuit/core/index.js'
import { definePlays, playFor } from '../../engine/plays.js'

const corePlays = {
  gates: { editor: 'circuit', judge: 'cases', resources: 'gates', target: 'shown', tileSettings: 'hidden' },
  proof: { editor: 'circuit', judge: 'once', resources: 'proof', results: 'hidden', output: 'target', tileSettings: 'hidden' },
  machine: { editor: 'circuit', judge: 'steps', resources: 'machine', tileSettings: 'hidden' },
  truth: { editor: 'values', judge: 'table', checks: 'shown', resources: 'truth', stage: 'vt-stage', layout: 'lg-truth-level' },
  translate: { editor: 'tree', judge: 'check', checks: 'hidden', resources: 'translation', stage: 'fo-stage', layout: 'fo-level' },
  query: { editor: 'tree', judge: 'check', checks: 'shown', resources: 'query', stage: 'fo-stage', layout: 'fo-level' },
  script: { editor: 'fields', judge: 'rows', checks: 'hidden', resources: 'script', stage: 'fo-stage sc-stage', layout: 'fo-level sc-level' },
  model: { editor: 'scenario', judge: 'steps', checks: 'shown', resources: 'worldCheck', stage: 'fo-stage', layout: 'fo-level' },
  define: { editor: 'tree', judge: 'once', checks: 'hidden', resources: 'definition', stage: 'lg-define', layout: 'lg-define-level', gives: 'reference' },
  iso: { editor: 'tree', judge: 'once', checks: 'hidden', resources: 'declaration', stage: 'fo-stage', layout: 'fo-level lg-level' },
  audit: { editor: 'checks', judge: 'boards', checks: 'shown', resources: 'audit', stage: 'fo-stage', layout: 'fo-level lg-level' },
}

const taskBoard = ['brief', 'hints']
export const plays = definePlays(Object.fromEntries(Object.entries(corePlays).map(([id, play]) => [`logic:${id}`, { ...play, taskBoard }])), circuitPlaySchema)

/** Apply the task's reveal policy to the circuit template, for the screen and text play alike. */
export function gatesPlayFor(task) {
  const play = playFor(plays, task)
  if (task.blind || task.hideTarget === true) return { ...play, target: 'hidden' }
  if (task.hideTarget === false) return { ...play, target: 'shown' }
  return play
}
