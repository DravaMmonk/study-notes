import { circuitTools } from './author-tools.js'
import { availabilityRecords, circuitReports } from './baseline.js'
import { dependencies, dot, mermaid } from './dependencies.js'
import { boardSvg } from './board/svg.js'
import { specProblems, validateProblems } from './contracts.js'
import { circuitOperations } from './author-operations.js'
import { PART } from './parts/schema.js'
import { S, parsePath } from 'kernel'
import { firstText } from 'kernel'
import { referenceDependencies, externalSupplies } from './course-links.js'
import { readWorkSet } from './course-model.js'
import { implementationProblems } from './parts/dependencies.js'
import { taskIdsOf } from 'kernel'
import { partProblems, withParts } from './parts/define.js'
import { shapeAt } from 'kernel'
import { mapBlueprintNames } from './board/text.js'
import { grantIndex, grants } from './grants.js'
import { makesParts, PARTS_FILE } from './parts/schema.js'

/** Package-owned qualification of references embedded in circuit works and grant fields. */
export function circuitNames({ name, vocabulary, objects = {}, parts = new Set(), partRules = new Set(), context }) {
  parts = new Set([...parts, ...Object.keys(objects['circuit/part'] ?? {}).map(id => id.split('/').at(-1))])
  partRules = new Set([...partRules, ...Object.entries(objects['circuit/part'] ?? {}).filter(([, part]) => part.inside && ['logic:family-lemma', 'logic:family-rule'].includes(part.family)).map(([id]) => id.split('/').at(-1))])
  const part = value => {
    if (typeof value !== 'string' || value.includes(':')) return value
    if (value.includes('/')) return name(value)
    return parts.has(value.split(/[.=]/)[0]) || !vocabulary?.kinds.part?.[value.split(/[.=]/)[0]] ? name(value) : value
  }
  const rule = value => typeof value === 'string' && (value.includes('/') || partRules.has(value.split('.')[0])) ? name(value) : value
  return {
    link(kind, target) {
      if (kind !== 'part' || !/^(part|lemma):/.test(target)) return undefined
      const colon = target.indexOf(':')
      return `${target.slice(0, colon + 1)}${part(target.slice(colon + 1))}`
    },
    rewrite({ value, schema, path, key, object }) {
      if (['circuit/part', 'grant', 'circuit/grant'].includes(schema?.reference) || ['part', 'unlock', 'circuit/part'].includes(schema?.kind) && ['ref', 'name'].includes(schema?.type)) return { value: part(value) }
      if (schema?.type === 'board' || schema?.view === 'board') return { value: Array.isArray(value) && value.every(line => typeof line === 'string') ? mapBlueprintNames(value, type => type.includes('/') || parts.has(type) ? name(type) : type, rule) : value }
      if (key === 'id' && path.length === 3 && path[0] === 'stages') return { value: name(value) }
      if (['rules', 'using', 'simp'].includes(key) && Array.isArray(value)) return { value: value.map(rule) }
      if (['gives', 'opens', 'withholds', 'awards'].includes(key) && Array.isArray(value) && (path.length === 1 || path.at(-3) === 'tasks' || path.at(-2) === 'reference')) return { value: value.map(part) }
      if (key === 'tray') return { value: Array.isArray(value) ? value.map(name) : name(value) }
      if (context === 'configuration' && path.at(-2) === 'borrow') return { key: part(key) }
      if (key === 'open' && context === 'configuration') return { value: Object.fromEntries(Object.entries(value).map(([rule, items]) => [rule, items.map(item => {
        const at = item.indexOf('@', item.startsWith('@') ? 1 : 0)
        return at < 0 ? item : `${part(item.slice(0, at))}@${name(item.slice(at + 1))}`
      })])) }
      if (key === 'reference' && vocabulary?.level?.fields?.tasks) return { schema: { type: 'obj', fields: { ...vocabulary.level.fields, ...shapeAt(vocabulary.level.fields.tasks.of, value, [], { vocabulary })?.fields, solution: { type: 'board' } } } }
      void object
    },
  }
}

export const partMeaning = {
  capability: 'part',
  configuration: { primitives: 'course.json', borrow: 'course.json' },
  tools: circuitTools,
  quotes: ({ content }) => Object.values(content.registries?.['circuit/quote'] ?? {}).map(quote => quote.text),
  catalogKey: ({ prefix, path: [field, id, ...rest], segment }) => prefix === 'parts' && field === 'parts' ? ['part', id, ...rest].map(segment).join('.') : null,
  baselineCourse: ({ fragment }) => ({ publications: fragment.course.publications, stages: fragment.course.stages }),
  baselineStructure: ({ content }) => ({ parts: content.partDefs, ...(Object.keys(content.registries.symbol ?? {}).length && { symbols: content.registries.symbol }), trays: content.trays }),
  baselineRecords: availabilityRecords,
  baselineReports: circuitReports,
  search({ content, texts }) {
    for (const [id, part] of Object.entries(content.partDefs?.parts ?? {})) texts(part, PARTS_FILE.fields.parts.of, { file: `parts/${id}.json`, in: 'parts', annotations: path => path.at(-1) === 'desc' ? { literal: { rule: 'part-description-reference', says: 'component descriptions are plain text; write names without reference markup' } } : {} }, ['parts', id])
  },
  dependencyGraph: ({ course, dot: asDot, levels }) => (asDot ? dot : mermaid)(dependencies(course), { levels }),
  renderWork: ({ text, title }) => boardSvg(text, { title }),
  renderFields: ({ value }) => value.adds ? [`brings in: ${value.adds.join(', ')}`] : [],
  namesForTool({ content, game }) {
    return { parts: game ? (game.parts?.all ?? []).map(part => ({ key: part.key, name: part.name, part: part.part ?? (part.key.startsWith('part:') ? part.key.slice(5) : part.key), at: part.at?.[0] ?? game.levels.find(level => (level.unlocks ?? []).includes(part.key))?.id ?? null })) : Object.entries(content.partDefs?.parts ?? {}).map(([key, part]) => ({ key, name: part.name, part: key, at: null })) }
  },
  contract: { spec: specProblems, validate: validateProblems },
  operations: circuitOperations,
  selectors: ['part'],
  textTarget({ workspace, args }) {
    return args.in === 'parts' ? [{ id: 'parts', value: workspace.partDefs, schema: PARTS_FILE, selector: { in: 'parts' }, set: value => { workspace.partDefs = value } }] : []
  },
  operationTargets: ({ workspace, args }) => ({ part: [PART, workspace.partDefs?.parts?.[args.part]], parts: [PARTS_FILE, workspace.partDefs] }),
  sourceArguments({ args, operation, local }) {
    if (args.path !== undefined && (operation.startsWith('parts.') || args.in === 'parts')) {
      const path = parsePath(args.path)
      if (path[0] === 'parts' && path.length > 1) args.path = [path[0], local(path[1]), ...path.slice(2)]
    }
  },
  textPrefix: 'part',
  workspace(ws) {
    Object.defineProperty(ws, 'partDefs', {
      get: () => ({ parts: Object.fromEntries(ws.contentObjects['circuit/part'] ?? []) }),
      set: value => { ws.contentObjects['circuit/part'] = new Map(Object.entries(value.parts)) },
    })
  },
  textNames({ content, game, vocabulary }) {
    if (game) return { part: new Map((game.parts?.all ?? []).map(part => [part.key, String(firstText(part.name))])) }
    const names = new Map(Object.entries(content.registries['circuit/part'] ?? {}).map(([id, object]) => [id, String(firstText(object.name ?? id))]))
    for (const id of Object.keys(content.registries['circuit/part'] ?? {})) { names.set(`part:${id}`, ''); names.set(`lemma:${id}`, '') }
    for (const id of Object.keys(vocabulary.kinds.unlock ?? {})) names.set(id, '')
    return { part: names }
  },
  texts: ({ content, game }) => ({ parts: game ? (game.parts?.all ?? []).map(part => ({ key: part.key, name: part.name, desc: part.desc })) : content.partDefs?.parts }),
  dependencies: referenceDependencies,
  plan: externalSupplies,
  supplies: ({ plan, level }) => plan.externalAwardSources?.has(level),
  readWorks: ({ content, readers }) => readWorkSet(content, readers),
  taskModule: () => 'circuit',
  runtimeIds({ content, tasks, taskModule }) {
    if (tasks.length) return tasks.some(task => !taskModule(task)) ? ['circuit'] : []
    const parts = [...Object.values(content.partDefs?.parts ?? content.registries?.['circuit/part'] ?? {}), ...Object.values(content.registries?.symbol ?? {})]
    const references = parts.flatMap(part => part.inside?.map(entry => entry.reference) ?? [])
    if (references.length) return [...new Set(references.map(task => taskModule(task) ?? 'circuit'))]
    const owner = name => typeof name === 'string' && name.includes(':') ? name.split(':')[0] : null
    const types = parts.flatMap(part => [part.outputType, ...(part.inputs ?? []).map(port => port.type)])
    return [[...types.map(owner), ...parts.map(part => owner(part.family) ?? owner(part.mark))].find(id => id && id !== 'circuit') ?? 'circuit']
  },
  scope({ content, id, taskModule }) {
    const parts = Object.fromEntries(Object.entries(content.partDefs?.parts ?? {}).filter(([, part]) => !part.inside || part.inside.some(entry => (taskModule(entry.reference) ?? 'circuit') === id)))
    return { ...content, partDefs: { ...content.partDefs, parts } }
  },
  validationVocabulary: ({ vocabulary, content, workspace }) => withParts(vocabulary, (content ?? workspace).partDefs),
  validationNames: ({ content }) => ({ tray: new Set(Object.keys(content.registries?.['circuit/tray'] ?? {})) }),
  validate({ content, vocabulary }) {
    if (content.partDefs !== undefined) {
      const problems = partProblems(content.partDefs, vocabulary, { tasks: taskIdsOf(content.levels) })
      return problems.length ? problems : implementationProblems(content.partDefs)
    }
    return makesParts(vocabulary) && !vocabulary.kinds.part ? [{ at: 'parts', says: `the ${vocabulary.module} module's parts are data: the game needs parts` }] : []
  },
  type: 'circuit/part', read: value => value,
  names: circuitNames,
  vocabulary: circuitVocabulary,
  derived: ['partDefs', 'trays', 'replaces'],
  matches: (expected, actual) => ['grant', 'circuit/grant'].includes(expected) && grants.types.has(actual),
  identities: ({ kind, value }) => (grants.types.has(kind) ? (value.stages ?? []).map(stage => ({ kind, name: stage.id, value: stage })) : []),
  indexes: ({ registries }) => [...grantIndex(registries)].map(([name, entry]) => ({ kind: entry.type, name, value: entry.object })),
  source: ({ content }) => ({ 'circuit/part': content.partDefs?.parts ?? {} }),
  assemble({ registries, relationEdges, resolve, problems, schemas }) {
    const parts = registries['circuit/part'] ?? {}
    registries['circuit/part'] = { ...schemas.kinds?.part, ...parts }
    const replaces = {}
    for (const { from, to } of relationEdges.replaces ?? []) (replaces[from] ??= []).push(to)
    const trays = {}
    for (const [name, tray] of Object.entries(registries['circuit/tray'] ?? {})) {
      const menus = (tray.menus ?? []).map(menu => ({ id: menu.id, title: menu.title, items: menu.values.flatMap(value => resolve(value, 'circuit/grant', `trays/${name}/menus/${menu.id}`)) }))
      if (new Set(menus.map(menu => menu.id)).size !== menus.length) problems.push({ at: `trays/${name}`, says: 'duplicate menu id' })
      const direct = tray.values.flatMap(value => resolve(value, 'circuit/grant', `trays/${name}`))
      trays[name] = { name: tray.title, desc: tray.desc, workshop: tray.workshop,
        items: [...menus.map(menu => menu.id), ...direct].map(id => menus.find(menu => menu.id === id) ?? id) }
    }
    return { partDefs: { parts }, trays, replaces }
  },
  relationProblems({ name, relation, edges, expand }) {
    if (relation.kind !== 'replaces') return []
    return edges.flatMap(edge => [
      ...[edge.from, edge.to].flatMap(endpoint => expand(endpoint, 'circuit/part').some(id => grantIndex(expand.registries).get(id)?.part !== id) ? [{ at: `relations/${name}`, says: 'replaces only links different base parts; stages upgrade in their declared order' }] : []),
      ...(edge.from === edge.to ? [{ at: `relations/${name}`, says: 'a part cannot replace itself' }] : []),
    ])
  },
  stamp: ({ content, plain }) => plain(content.partDefs ?? null, PARTS_FILE),
}

export const trayMeaning = {
  type: 'circuit/tray', read: value => value,
  selector: 'tray',
  textParameters: { tray: S.opt(S.str()) },
  textTarget({ workspace, args, vocabulary }) {
    return args.tray === undefined ? [] : [{ id: args.tray, value: workspace.trays.get(args.tray), schema: vocabulary.objectKinds['circuit/tray'].schema, selector: { tray: args.tray }, set: value => workspace.trays.set(args.tray, value) }]
  },
  operationTargets: ({ workspace, args, vocabulary }) => ({ tray: [vocabulary.objectKinds['circuit/tray']?.schema, workspace.trays?.get(args.tray)] }),
  textPrefix: 'tray',
  workspace(ws) { Object.defineProperty(ws, 'trays', { get: () => ws.contentObjects['circuit/tray'], set: value => { ws.contentObjects['circuit/tray'] = value } }) },
  identities: ({ kind, value }) => kind === 'circuit/tray' ? (value.menus ?? []).map(menu => ({ kind: 'menu', name: menu.id, value: menu })) : [],
}

export function circuitVocabulary(vocabulary) {
  const grantFields = new Set(['tray', 'adds', 'gives', 'withholds', 'opens', 'awards', 'local', 'featuredParts', 'publishes'])
  const strip = schema => {
    if (!schema) return schema
    if (schema.type === 'either') return { ...schema, of: schema.of.map(strip) }
    if (schema.type === 'by') return { ...schema, cases: Object.fromEntries(Object.entries(schema.cases).map(([name, shape]) => [name, strip(shape)])) }
    return { ...schema, fields: Object.fromEntries(Object.entries(schema.fields).filter(([key]) => !grantFields.has(key)).map(([key, field]) => [key, key === 'tasks' ? { ...field, of: strip(field.of) } : field])) }
  }
  return { ...vocabulary, level: strip(vocabulary.level) }
}
