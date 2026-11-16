import { registerContentKinds } from '../../engine/content-kinds.js'
import { BUILTINS, BUILTIN_ITEMS } from '../../engine/parts/builtins.js'
import { OPS } from './ops.js'
import { displayItems } from '../../engine/bench.js'
import { qualifyItems } from '../../engine/capabilities.js'
import { vocabulary } from './vocabulary.js'

export default {
  id: 'circuit',
  register(registry) {
    registerContentKinds(registry, 'circuit')
    registry.vocabulary('circuit', vocabulary)
    registry.add('display', 'circuit:screen', { about: { en: 'Circuit cards and result presentation' }, role: 'circuit' })
    registry.implementDisplays(['circuit:screen'], '../modules/circuit/ui/displays.js')
    Object.assign(registry.kinds.op, BUILTIN_ITEMS)
    for (const [name, item] of Object.entries(BUILTIN_ITEMS)) registry.add('operation', name, { kind: 'op', ...item })
    registry.implementOperations({ ...OPS, ...BUILTINS })
    const displays = qualifyItems('circuit', 'display', displayItems({}))
    Object.assign(registry.kinds.display ??= Object.create(null), displays)
    for (const [name, item] of Object.entries(displays)) registry.add('display', name, { kind: 'display', ...item })
    registry.implementDisplays(Object.keys(displays), '../modules/circuit/ui/bench.jsx')
    registry.add('valueType', 'circuit:number', { about: { en: 'number' } })
    registry.add('valueType', 'circuit:boolean', { about: { en: 'boolean' } })
    registry.add('valueType', 'circuit:string', { about: { en: 'string' } })
    registry.add('valueType', 'circuit:list', { about: { en: 'list' } })
    registry.add('valueType', 'circuit:any', { about: { en: 'any' } })
    registry.add('board', 'circuit:board', { about: { en: 'circuit board' }, valueTypes: ['circuit:number'] })
  },
}
