import { module as circuit } from '../../../../packages/circuit/core/index.js'
import { vocabulary } from './vocabulary.js'

export default {
  id: 'tick-bus',
  register(registry) {
    if (!registry.schemas.circuit) circuit.register(registry)
    registry.vocabulary('tick-bus', vocabulary)
    registry.add('display', 'tick-bus:screen', { about: { en: 'Tick bus cards, readouts and panels' }, role: 'circuit' })
    registry.add('display', 'tick-bus:catalog', { about: { en: 'Tick bus fixed cards' }, role: 'catalog' })
    registry.implementDisplays(['tick-bus:screen', 'tick-bus:catalog'], '../modules/tick-bus/ui/displays.js')
    registry.add('board', 'tick-bus:board', { about: { en: 'tick-bus board' }, valueTypes: ['circuit:number'] })
  },
}
