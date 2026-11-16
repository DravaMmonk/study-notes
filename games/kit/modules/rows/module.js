import { vocabulary } from './vocabulary.js'

export default {
  id: 'rows',
  register(registry) {
    registry.vocabulary('rows', vocabulary)
    registry.add('display', 'rows:sums', { about: { en: 'Addition row presentation' }, role: 'rows' })
    registry.implementDisplays(['rows:sums'], '../modules/rows/ui/displays.js')
    registry.add('valueType', 'rows:sum', { about: { en: 'An addition expression' } })
    registry.add('board', 'rows:board', { about: { en: 'rows board' }, valueTypes: ['rows:sum'] })
  },
}
