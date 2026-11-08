import { sensor } from '../../../circuit/index.js'
import { kindOf } from './views/views.js'
import { INPUT_LABELS } from '../words.js'

// A level's inputs as sensors (games/kit/circuit/sensors.js), the one place their names and what they carry come
// from: the cards on the board, their captions and the inputs pane all read them here.

/** Each input by name: the level's own name for it (or a stock one, its id, or 输入), carrying what the first test feeds it. */
export function levelSensors(level, tests = level.tests) {
  const many = level.inputs.length > 1
  const labels = level.inputLabels ?? (many ? INPUT_LABELS : {})
  return Object.fromEntries(level.inputs.map((name) => {
    const value = tests?.[0]?.inputs?.[name]
    return [name, sensor(name, labels[name] ?? (many ? name : { zh: '输入', en: 'Input' }), value ? kindOf(value) : null, { named: Boolean(labels[name]), description: level.inputDescriptions?.[name] })]
  }))
}
