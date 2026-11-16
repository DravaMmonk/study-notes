import { vocabulary } from './vocabulary.js'

export default {
  id: 'tick-bus',
  register(registry) {
    registry.vocabulary('tick-bus', vocabulary)
    registry.add('board', 'tick-bus:board', { about: { en: 'tick-bus board' }, valueTypes: ['circuit:number'] })
  },
}
