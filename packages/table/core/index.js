export { tr } from './lang.js'
export { isEn } from './lang.js'
export { T } from './lang.js'
export { lazy } from './lang.js'
export { hydrate } from './lang.js'
export { OPS } from './model/format.js'
export { tidy } from './model/format.js'
export { fmt } from './model/format.js'
export { signal } from './model/format.js'
export { N } from './model/scene.js'
export { E } from './model/scene.js'
export { gridScene } from './model/scene.js'
export { circuitFig } from './model/scene.js'
export { windowFig } from './model/scene.js'
export { blank } from './model/board.js'
export { picksOf } from './model/board.js'
export { withPicks } from './model/board.js'
export { readsOf } from './model/board.js'
export { usesSensor } from './model/board.js'
export { partsOfType } from './model/board.js'
export { roleOf } from './model/board.js'
export { placed } from './model/board.js'
export { givenOf } from './model/board.js'
export { fitted } from './model/board.js'
export { portsProblem } from './model/board.js'
export { cell } from './model/world.js'
export { num } from './model/world.js'
export { yes } from './model/world.js'
export { seg } from './model/world.js'
export { cat } from './model/world.js'
export { DIR } from './model/world.js'
export { THIS_CELL } from './model/world.js'
export { world } from './model/world.js'
export { visibleSensors } from './model/world.js'
export { sensorsOf } from './model/world.js'
export { recordReads } from './model/world.js'
export { windowOf } from './model/world.js'
export { look } from './model/world.js'
export { modelOf } from './model/run.js'
export { MAX_ROUNDS } from './model/run.js'
export { PRIMITIVES } from './model/parts.js'
export { MODELS } from './model/parts.js'
export { modelsOf } from './model/parts.js'
export { CARDS } from './model/parts.js'
export { isCard } from './model/parts.js'
export { isGiven } from './model/parts.js'
export { partsOf } from './model/parts.js'
import { createCapabilityRegistry, registeredValueTypes } from 'kernel'
import { vocabulary } from './vocabulary.js'
import { PRIMITIVES } from './model/parts.js'
/** Extend one assembly's vocabulary without changing the native registry. */
export function extendVocabulary(base, contribution) {
  const registry = createCapabilityRegistry()
  registry.vocabulary(contribution.module, contribution)
  return {
    ...base,
    kinds: Object.fromEntries([...new Set([...Object.keys(base.kinds), ...Object.keys(registry.kinds)])]
      .map(kind => [kind, { ...base.kinds[kind], ...registry.kinds[kind] }])),
    capabilities: Object.fromEntries(Object.entries(registry.tables)
      .map(([kind, items]) => [kind, { ...base.capabilities[kind], ...items }])),
    languages: { ...base.languages, ...registry.languages },
  }
}

const valueTypes = {
  'table:number-input': { about: { zh: '数或一段数', en: 'A number or a segment of numbers' }, accepts: ['circuit:number', 'table:numbers'] },
  'table:boolean-input': { about: { zh: '真假值或一段真假值', en: 'A boolean or a segment of booleans' }, accepts: ['circuit:boolean', 'table:booleans'] },
  'table:category': { about: { zh: '类别及其显示名称', en: 'A category and its displayed label' } },
  'table:numbers': { about: { zh: '一段数值', en: 'A segment of numbers' } },
  'table:booleans': { about: { zh: '一段真假值', en: 'A segment of boolean values' } },
}

export function register(kernel) {
  Object.assign(registeredValueTypes, valueTypes)
  kernel.kind('table:model', {
    type: 'level', read: value => value,
    vocabulary(base) {
      const result = extendVocabulary(base, vocabulary)
      return {
        ...result,
        kinds: { ...result.kinds, valueType: { ...result.kinds.valueType, ...valueTypes } },
        capabilities: {
          ...result.capabilities,
          valueType: { ...result.capabilities.valueType, ...valueTypes },
          board: { ...result.capabilities.board, 'table:robot': {
            about: { zh: '逐格运行电路并读写表格的机器人', en: 'A robot that runs a circuit while reading and writing table cells' },
            valueTypes: ['circuit:number', 'circuit:boolean', 'table:category', 'table:numbers', 'table:booleans'],
            primitives: Object.keys(PRIMITIVES),
          } },
        },
      }
    },
  })
}

export { wiring, robotBlueprint } from './model/wiring.js'
