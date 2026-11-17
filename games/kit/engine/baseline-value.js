import { createHash } from 'node:crypto'

// Stable, lossless projections of runtime data; arrays retain execution order.
export function baselineValue(input) {
  const memo = new WeakMap(), hashes = new WeakMap(), pool = new Map()
  // Search traces copy growing states. Intern equal subtrees so complete reports stay practical.
  const intern = value => {
    if (!value || typeof value !== 'object' || hashes.has(value)) return value
    const entries = Object.entries(value).map(([key, v]) => [key, intern(v)])
    const token = v => v && typeof v === 'object' ? { hash: hashes.get(v) } : v
    const hash = createHash('sha256').update(JSON.stringify([Array.isArray(value), entries.map(([key, v]) => [key, token(v)])])).digest('hex')
    if (pool.has(hash)) return pool.get(hash)
    const out = Array.isArray(value) ? entries.map(([, v]) => v) : Object.fromEntries(entries)
    hashes.set(out, hash)
    pool.set(hash, out)
    return out
  }
  const project = (value, ancestors = new Set()) => {
    if (value === undefined) return { $undefined: true }
    if (typeof value === 'number' && !Number.isFinite(value)) return { $number: String(value) }
    if (Object.is(value, -0)) return { $number: '-0' }
    if (typeof value === 'symbol') return { $symbol: value.description }
    if (typeof value === 'function') return { $function: true }
    if (value === null || typeof value !== 'object') return value
    if (ancestors.has(value)) throw new Error('cyclic baseline data: select a data projection')
    if (memo.has(value)) return memo.get(value)
    const next = new Set([...ancestors, value])
    const visit = v => project(v, next)
    const keep = result => { const out = intern(result); memo.set(value, out); return out }
    if (value instanceof Map) return keep({ $map: [...value].map(([k, v]) => [visit(k), visit(v)]).sort((a, b) => JSON.stringify(a[0]).localeCompare(JSON.stringify(b[0]), 'en')) })
    if (value instanceof Set) return keep({ $set: [...value].map(visit).sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b), 'en')) })
    if (ArrayBuffer.isView(value)) return keep(Array.from(value, visit))
    if (Array.isArray(value)) return keep(value.map(visit))
    if (value.constructor?.name === 'Lazy') return String(value)
    return keep(Object.fromEntries(Object.keys(value).sort().map(key => [key, visit(value[key])])))
  }
  return project(input)
}

// The eight QED connectives changed object ownership, retaining their exact identities and values.
const FORMULA_NAMES = ['formulaAnd', 'formulaOr', 'formulaNot', 'formulaImplies', 'formulaIff', 'formulaForall', 'formulaExists', 'formulaFalse']
const mixedFormulaSources = new Set(['certificate-certificate', 'gIff', 'machine-certificate', 'natInd', 'res'])
const mixedFormulaEdge = edge => /^(?:qed\/)?formulaForall$/.test(edge?.to) && mixedFormulaSources.has(edge?.from?.replace(/^qed\//, '')) && (edge.of === 'grant' || edge.of === undefined)
const formulaName = name => typeof name === 'string' && FORMULA_NAMES.includes(name.replace(/^qed\//, ''))
const formulaCopy = new RegExp(`(?<![\\w/])((?:qed/)?)part\\.(${FORMULA_NAMES.join('|')})(?=\\.)`, 'g')
const formulaFile = new RegExp(`(?<![\\w/])((?:packages/qed/|qed/)?)parts/(${FORMULA_NAMES.join('|')})(?=\\.json\\b)`, 'g')

export function formulaSymbolBaseline(input) {
  const memo = new WeakMap()
  const walk = (value, identity = null) => {
    if (typeof value === 'string') return value.replace(formulaCopy, '$1symbol.$2').replace(formulaFile, '$1symbols/$2')
    if (!value || typeof value !== 'object') return value
    if (memo.has(value)) return memo.get(value)
    if (Array.isArray(value)) {
      const owner = formulaName(value[0]) ? value[0] : identity
      let out = value.map(child => walk(child, owner))
      // Ownership changes the typed order edges for these names. Preserve every unrelated edge's order.
      if (value.some(edge => edge && typeof edge === 'object' && ['part', 'symbol', 'grant'].includes(edge.of) && (formulaName(edge.from) || formulaName(edge.to)))) {
        const affected = edge => ['part', 'symbol', 'grant'].includes(edge?.of) && (formulaName(edge?.from) || formulaName(edge?.to))
        out = [...out.filter(edge => !affected(edge)), ...out.filter(affected).sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b), 'en'))]
      }
      memo.set(value, out)
      return out
    }
    const owner = formulaName(value.part) ? value.part : formulaName(value.type) ? value.type : identity
    const out = Object.fromEntries(Object.entries(value).filter(([key, child]) => !(formulaName(owner) && key === 'editor' && child === 'strip'))
      .map(([key, child]) => [key, walk(child, formulaName(key) ? key : owner)]))
    if (out.formulaParts && Object.keys(out.formulaParts).length && Object.values(out.formulaParts).every(symbol => formulaName(symbol.type))) {
      out.formulaSymbols = out.formulaParts
      delete out.formulaParts
    }
    if ((formulaName(out.from) || formulaName(out.to)) && ['symbol', 'grant'].includes(out.of)) out.of = 'part'
    // Move only these eight definitions into the canonical symbol inventory on either side.
    if (out.structure?.parts?.parts) {
      const parts = { ...out.structure.parts.parts }
      const symbols = { ...out.structure.symbols }
      for (const [name, definition] of Object.entries(parts)) if (formulaName(name)) {
        if (Object.hasOwn(symbols, name)) throw new Error(`baseline symbol collision: ${name}`)
        symbols[name] = definition
        delete parts[name]
      }
      out.structure = { ...out.structure, parts: { ...out.structure.parts, parts }, ...(Object.keys(symbols).length && { symbols }) }
    }
    memo.set(value, out)
    return out
  }
  // Only the five authored cross-type QED edges retired `of: grant`.
  const order = input?.structure?.relations?.order
  if (Array.isArray(order)) input = { ...input, structure: { ...input.structure, relations: { ...input.structure.relations, order: order.map(edge => mixedFormulaEdge(edge) ? { ...edge, of: 'part' } : edge) } } }
  return walk(input)
}

/** Only registered names are aliases; prose, formulas and arbitrary slashes stay meaningful. */
export function nameNormalizer(names) {
  // MODULES.md §10.3 explicitly makes these kind/path/key spellings equivalent.
  const tableNames = new Set(["world-grid", "world-gridYes", "world-piles", "world-tri", "world-lawn", "world-strip", "world-pile", "world-coins", "world-parts", "world-rob1", "world-rob2", "world-ring", "world-prefix", "world-heights", "world-gains", "world-keys", "world-river", "world-stock", "world-align", "world-local", "world-knap", "world-roll", "world-interval", "world-vgrid", "world-tags", "world-pic", "robot-scout", "robot-ranger", "robot-reach", "robot-broom", "robot-stack", "robot-loop", "circuit", "fill", "trace", "link", "pack", "breach", "policy", "seam", "figure-scene", "figure-grid", "figure-circuit", "figure-window", "condition-reads", "condition-uses", "condition-has", "condition-feeds", "condition-placed", "condition-wired", "condition-wiredOut", "condition-all", "condition-any", "condition-not", "trace-lcs", "trace-edit", "trace-local", "trace-knap", "trace-seam", "trace-tags", "panel-lcs", "panel-edit", "panel-spell", "panel-local", "panel-tags", "panel-knap", "panel-roll", "panel-dictionary", "panel-robConflict", "explain-roll", "port-reads", "port-way", "port-start", "port-named"])
  const kindNames = text => text
    .replace(/(?<![\w/-])state-graph:([A-Za-z][A-Za-z0-9_-]*)(?![\w-])/g, (name, local) => tableNames.has(local) ? `table:${local}` : name)
    .replace(/(overrides\/[^/\s]+\/)tag\//g, '$1tags/')
    .replace(/\bpieced it together\b/g, 'assembled it')
    .replace(/\bpieced\b/g, 'assembled')
    .replace(/\btags\/(?:piece|circuit\/part)\//g, 'tags/part/')
    .replace(/\bpieces(?=\/|\.json\b)/g, 'parts')
    .replace(/\bpiece\//g, 'parts/')
    .replace(/\blogic\/symbol\b/g, 'symbol')
    .replace(/\bcircuit\/part\b/g, 'part')
    .replace(/\btags\/circuit\/tray\//g, 'tags/tray/')
    .replace(/\bcircuit\/tray\b/g, 'tray')
    .replace(/pieces/g, 'parts').replace(/Pieces/g, 'Parts').replace(/PIECES/g, 'PARTS')
    .replace(/piece/g, 'part').replace(/Piece/g, 'Part').replace(/PIECE/g, 'PART')
  // Preserve the exact retired bus and image collisions in the frozen native vocabulary inventory.
  names = [...new Set([...names, 'tick-bus:family-value', 'tick-bus:family-memory', 'image:add', 'image:board', 'image:const', 'image:family-search', 'image:merge', 'image:mul', 'image:sub', 'table:not', 'table:robot-loop', 'table:circuit', 'table:const', 'table:add', 'table:mul', 'logic:allE', 'logic:allI', 'logic:andE', 'logic:andI', 'logic:anyR', 'logic:append', 'logic:assumption', 'logic:audit', 'logic:botE', 'logic:consFront', 'logic:defer', 'logic:define', 'logic:each', 'logic:eachOf', 'logic:exE', 'logic:exI', 'logic:family-box', 'logic:family-built', 'logic:family-gate', 'logic:family-lemma', 'logic:family-loop', 'logic:family-rule', 'logic:family-tactic', 'logic:gates', 'logic:hyp', 'logic:impI', 'logic:instances', 'logic:iso', 'logic:judgment', 'logic:keepBound', 'logic:lemma', 'logic:machine', 'logic:machine-value', 'logic:mark-formulaAnd', 'logic:mark-formulaExists', 'logic:mark-formulaFalse', 'logic:mark-formulaForall', 'logic:mark-formulaIff', 'logic:mark-formulaImplies', 'logic:mark-formulaNot', 'logic:mark-formulaOr', 'logic:mkRule', 'logic:model', 'logic:mp', 'logic:names', 'logic:natInd', 'logic:occurrences', 'logic:options', 'logic:orE', 'logic:orI', 'logic:oracle', 'logic:proof', 'logic:query', 'logic:raa', 'logic:refl', 'logic:repeat', 'logic:replay', 'logic:res', 'logic:resolve', 'logic:rewrite', 'logic:rule', 'logic:ruleChoices', 'logic:rules', 'logic:rw', 'logic:script', 'logic:search', 'logic:skolem', 'logic:swapConcl', 'logic:things', 'logic:toClauses', 'logic:translate', 'logic:truth', 'logic:uCheck', 'logic:uConflict', 'logic:uDecompose', 'logic:uDelete', 'logic:uEliminate', 'logic:uPattern', 'logic:uSwap', 'logic:want-agree', 'logic:want-answers', 'logic:want-becomes', 'logic:want-clauses', 'logic:want-decide', 'logic:want-elim', 'logic:want-expose', 'logic:want-fails', 'logic:want-proved', 'logic:want-refuted', 'logic:want-unify'].map(name => kindNames(name.replace(/^[^:]+:(@?[a-z][a-z0-9-]*\/[A-Za-z0-9][A-Za-z0-9_-]*)$/, '$1'))))]
  const local = name => kindNames(name).replace(/^@?[^/:]+[/:]/, '').replace(/^(world|robot|port|want|family)-/, '')
  const aliases = new Map()
  for (const name of names) {
    const short = local(name)
    const group = aliases.get(short) ?? new Set()
    group.add(name)
    aliases.set(short, group)
  }
  // Ambiguous local names keep their qualified identity; never merge two independent objects.
  const pairs = [...new Set(names)].filter(name => local(name) !== name && aliases.get(local(name)).size === 1).sort((a, b) => b.length - a.length || a.localeCompare(b, 'en'))
  const escape = text => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const pattern = pairs.length ? new RegExp(`(?<![\\w/-])(${pairs.map(escape).join('|')})(?![\\w-])`, 'g') : null
  const normalize = text => {
    const named = kindNames(text)
    return pattern ? named.replace(pattern, name => local(name)) : named
  }
  return input => {
    const memo = new WeakMap()
    const walk = value => {
      if (typeof value === 'string') return normalize(value)
      if (!value || typeof value !== 'object') return value
      if (memo.has(value)) return memo.get(value)
      if (Array.isArray(value)) { const out = value.map(walk); memo.set(value, out); return out }
      const entries = Object.entries(value).map(([key, v]) => [normalize(key), walk(v)])
      for (const [key, list] of entries) if (key === '$map' || key === '$set') list.sort((a, b) => JSON.stringify(key === '$map' ? a[0] : a).localeCompare(JSON.stringify(key === '$map' ? b[0] : b), 'en'))
      if (new Set(entries.map(([key]) => key)).size !== entries.length) throw new Error(`baseline alias collision: ${Object.keys(value).join(', ')}`)
      const out = Object.fromEntries(entries.sort(([a], [b]) => a.localeCompare(b, 'en')))
      memo.set(value, out)
      return out
    }
    return formulaSymbolBaseline(walk(input))
  }
}

// Keep shared proof terms shared on disk. Decoding removes representation identity before comparison.
export function packBaseline(value) {
  const nodes = [], seen = new WeakMap()
  const encode = value => {
    if (value === null || typeof value !== 'object') return value
    if (seen.has(value)) return { ref: seen.get(value) }
    const id = nodes.length
    seen.set(value, id)
    nodes.push(null)
    nodes[id] = Array.isArray(value) ? { array: value.map(encode) } : { object: Object.fromEntries(Object.entries(value).map(([k, v]) => [k, encode(v)])) }
    return { ref: id }
  }
  const root = encode(value)
  return { encoding: 'shared-json-v1', root, nodes }
}

export function unpackBaseline({ encoding, root, nodes }) {
  if (encoding !== 'shared-json-v1') throw new Error('unknown baseline encoding')
  const memo = new Map()
  const decode = value => {
    if (value === null || typeof value !== 'object') return value
    const id = value.ref
    if (memo.has(id)) return memo.get(id)
    const node = nodes[id]
    const out = node.array ? node.array.map(decode) : Object.fromEntries(Object.entries(node.object).map(([k, v]) => [k, decode(v)]))
    memo.set(id, out)
    return out
  }
  return decode(root)
}

export function differences(before, after) {
  const memo = new WeakMap()
  const object = v => v !== null && typeof v === 'object'
  const same = (a, b) => {
    if (Object.is(a, b)) return true
    if (!object(a) || !object(b) || Array.isArray(a) !== Array.isArray(b)) return false
    if (memo.get(a)?.has(b)) return memo.get(a).get(b)
    const keys = Object.keys(a)
    const equal = keys.length === Object.keys(b).length && keys.every(key => Object.hasOwn(b, key) && same(a[key], b[key]))
    if (!memo.has(a)) memo.set(a, new WeakMap())
    memo.get(a).set(b, equal)
    return equal
  }
  const diff = (a, b, path) => {
    if (same(a, b)) return []
    if (!object(a) || !object(b) || Array.isArray(a) !== Array.isArray(b)) return [{ path, before: a, after: b }]
    return [...new Set([...Object.keys(a), ...Object.keys(b)])].sort().flatMap(key => diff(a[key], b[key], `${path}/${key.replaceAll('~', '~0').replaceAll('/', '~1')}`))
  }
  return diff(before, after, '$')
}

/** Only copy-key spellings and existence diagnostic wording are migration metadata. */
export function existenceBaseline(input) {
  const memo = new WeakMap()
  const walk = (value, key = '') => {
    if (typeof value === 'string') {
      if (key === '$key') return value.replace(/^(?:(@?[a-z][a-z0-9-]*\/)?)((?:glossary\.groups|group)\.)([A-Za-z0-9_-]+\.(?:title|desc))$/, '$1tag.$3')
      if (key === 'stdout') return value.replace(/^(  FAIL content: [^\n]+: )unknown (tag|level|part|entry|tray|section|relation|kind|grant|[a-z][a-z0-9-]*\/[a-z][a-z0-9-]*) ([#@A-Za-z0-9_/:.-]+)(?:; expected ([A-Za-z0-9_/-]+))?$/gm, (_, head, kind, target, member) => `${head}missing target ${kind} ${target}${member ? ` (member ${member})` : ''}`)
      return value
    }
    if (!value || typeof value !== 'object') return value
    if (memo.has(value)) return memo.get(value)
    const out = Array.isArray(value) ? value.map(child => walk(child)) : Object.fromEntries(Object.entries(value).map(([key, child]) => [key, walk(child, key)]))
    memo.set(value, out)
    return out
  }
  return walk(input)
}

/** Normalize only the initial version-format migration inside named configuration files. */
export function versionMetadataBaseline(input) {
  const memo = new WeakMap()
  const walk = (value, file) => {
    if (!value || typeof value !== 'object') return value
    if (memo.has(value)) return memo.get(value)
    let entries = Object.entries(value)
    if (file === 'package.json') {
      const old = Number.isInteger(value.vocabulary) && Object.keys(value).every(key => ['vocabulary', 'uses'].includes(key))
      const current = ['0.0.0', '1.0.0'].includes(value.version) && ['^0.0.0', '^1.0.0', '^2.0.0'].includes(value.kernel) && value.uses && !Array.isArray(value.uses) && Object.keys(value).every(key => ['version', 'kernel', 'uses'].includes(key)) && Object.values(value.uses).every(range => ['^0.0.0', '^1.0.0'].includes(range))
      if (old || current) entries = [['uses', old ? value.uses ?? [] : Object.keys(value.uses).filter(id => id !== 'circuit')]]
    }
    if (file === 'game.json' && ['^0.0.0', '^1.0.0', '^2.0.0'].includes(value.kernel) && value.packages && !Array.isArray(value.packages) && Object.values(value.packages).every(range => ['^0.0.0', '^1.0.0'].includes(range))) entries = entries.filter(([key]) => key !== 'kernel').map(([key, child]) => [key, key === 'packages' ? Object.keys(child).filter(id => id !== 'circuit') : child])
    const out = Array.isArray(value) ? value.map(child => walk(child)) : Object.fromEntries(entries.map(([key, child]) => [key, walk(child, key)]))
    memo.set(value, out)
    return out
  }
  return walk(input)
}

/** Step 6 changes chapter identities and removes the retired display-order representation only. */
export function collectionFieldsBaseline(value) {
  const result = structuredClone(value)
  const local = id => typeof id === 'string' ? id.replace(/^@(?:[^/]+\/)?/, '') : String(id)
  if (result.structure?.relations) delete result.structure.relations.order
  for (const era of Array.isArray(result.structure?.eras) ? result.structure.eras : []) {
    era.id = local(era.id)
    if (Number.isInteger(era.number) && String(era.number) === era.id) delete era.number
  }
  for (const record of result.records ?? []) {
    const plan = record.course?.plan
    if (!plan) continue
    for (const [, place] of plan.place?.$map ?? []) if (place.era !== undefined) place.era = local(place.era)
    for (const key of ['rows', 'tracks']) if (plan[key]?.$map) {
      plan[key].$map = plan[key].$map.map(([id, value]) => [local(id), value]).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)
    }
    for (const link of plan.dependencyLinks ?? []) if (link.source === 'course') link.detail = local(link.detail)
  }
  return result
}

/** The three image task discriminators move from native kind to the package play protocol. */
export function imageFieldsBaseline(value) {
  if (!value.structure?.levels) return value
  const plays = new Set(['image:graph', 'image:board', 'image:probe'])
  return { ...value, structure: { ...value.structure, levels: value.structure.levels.map(level => ({ ...level,
    tasks: level.tasks.map(task => {
      if (task.kind !== undefined || !plays.has(task.play)) return task
      const { play, ...fields } = task
      return { ...fields, kind: play }
    }),
  })) } }
}

/** Only former table tasks/references use the renamed play and panel fields. */
export function tableFieldsBaseline(value) {
 const plays = new Set(['circuit', 'fill', 'trace', 'link', 'pack', 'breach', 'policy', 'seam'].flatMap(name => [`table:${name}`, `state-graph:${name}`]))
 const memo = new WeakMap()
 const walk = input => {
  if (!input || typeof input !== 'object') return input
  if (memo.has(input)) return memo.get(input)
  if (Array.isArray(input)) { const result = []; memo.set(input, result); result.push(...input.map(walk)); return result }
  const result = Object.fromEntries(Object.entries(input).map(([key, child]) => [key, walk(child)]))
  memo.set(input, result)
  if (result.mode === undefined && plays.has(result.play)) { result.mode = result.play; delete result.play; if (result.panel !== undefined && result.after === undefined) { result.after = result.panel; delete result.panel } }
  return result
 }
 return walk(value)
}

/** Standalone palettes contain only primitives installed by the selected package closure. */
export function dependencyPaletteBaseline(input, { packaged, dependencies = [] } = {}) {
  if (!packaged) return input
  const absent = new Set([
    ...(!dependencies.includes('table') ? ['table:msum', 'table:mmin', 'table:mmax', 'table:many', 'table:not', 'table:add', 'table:mul', 'table:const', 'table:pass', 'table:block'] : []),
    ...(!dependencies.includes('logic') ? ['logic:hyp'] : []),
  ])
  const keep = name => !absent.has(name)
  return { ...input, records: input.records.map(record => {
    if (!record.availability) return record
    const a = record.availability
    return { ...record, availability: { ...a,
      usable: a.usable.filter(keep), emptyProgress: a.emptyProgress.filter(keep),
      definitions: Object.fromEntries(Object.entries(a.definitions).filter(([name]) => keep(name))),
      tray: { ...a.tray, types: a.tray.types.filter(keep), folded: a.tray.folded.filter(keep) },
    } }
  }) }
}
