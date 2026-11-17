import { partMeaning, trayMeaning } from '../content-meaning.js'


import { BUILTINS, BUILTIN_ITEMS } from "../parts/builtins.js"
import { OPS } from "./ops.js"




import { vocabulary } from "./vocabulary.js"

export default {
  id: 'circuit',
  register(registry) {
    registry.kind('circuit:part', partMeaning)
    registry.kind('circuit:tray', trayMeaning)
    registry.vocabulary('circuit', vocabulary)
    registry.add('display', 'circuit:screen', { about: { en: 'Circuit cards and result presentation' }, role: 'circuit' })
    registry.implementDisplays(['circuit:screen'], 'circuit/view')
    Object.assign(registry.kinds.op, BUILTIN_ITEMS)
    for (const [name, item] of Object.entries(BUILTIN_ITEMS)) registry.add('operation', name, { kind: 'op', ...item })
    registry.implementOperations({ ...OPS, ...BUILTINS })
    registry.add('valueType', 'circuit:number', { about: { en: 'number' } })
    registry.add('valueType', 'circuit:boolean', { about: { en: 'boolean' } })
    registry.add('valueType', 'circuit:string', { about: { en: 'string' } })
    registry.add('valueType', 'circuit:list', { about: { en: 'list' } })
    registry.add('valueType', 'circuit:any', { about: { en: 'any' } })
    registry.add('board', 'circuit:board', { about: { en: 'circuit board' }, valueTypes: ['circuit:number'] })
  },
}
