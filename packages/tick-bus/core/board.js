import { INPUTS, OUTPUTS, circuitBoard } from 'circuit'
import { drive, hearing } from './ticks.js'

export const board = circuitBoard({
  ticks: true,
  cards: [
    { type: 'line', side: 'left', of: (task) => (task.listens ? [{ name: 'line', label: { zh: '线', en: 'Line' } }] : []), params: () => ({}), part: hearing() },
    INPUTS,
    { type: 'say', side: 'right', of: (task) => (task.talks ? [{ name: 'say', label: { zh: '说', en: 'Say' } }] : []), part: drive() },
    OUTPUTS,
  ],
})
