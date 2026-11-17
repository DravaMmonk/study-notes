import { meaningsOf } from './kind-meanings.js'
import { contentSchemas } from './content.js'
import { sameJson } from './json-value.js'
import { playId } from './plays.js'
// The module runtime contract: what a module gives the kernel, checked mechanically. A module that
// passes it is one `npm run check`, the shell, and every tool built on them (the operation set, the MCP, the blind-play
// harness, the studio) can take without knowing anything about it. contract.test.js runs it over every registered module
// and its starter content.
//
//   runtimeProblems(name, runtime)           runtime.js: { vocabulary, prepare, spec, validate, play }
//   vocabularyProblems(name, vocabulary)    the vocabulary describes itself as data: kinds, items, schemas
//   specProblems(domain, content, spec)     spec(content): its course, levels, texts; the course hooks' shapes; the
//                                           boards round-trip through blueprint text
//   validateProblems(domain, content, spec) delegates semantic conformance checks to installed meanings
//   gameProblems(content, spec, game)       game.js's game (the shell's description) plays the same levels
//
// Each returns what is wrong as [string], empty when the contract holds (validateProblems: { problems, … }).
import { HINTS, S, validate as fits } from './schema.js'
import { describe } from './vocabulary.js'
import { taskShapes, tasksSchema } from './tasks.js'


/** Required runtime entries and optional tool extensions. */
export const ENTRIES = ['vocabulary', 'prepare', 'spec', 'validate', 'play']
const isFn = (f) => typeof f === 'function'
// Each extension point and the shape it must have. A tool that needs more of every domain adds its hook here.
//   play                { open(ctx), attempt(ctx, text) }: the blind-play harness's hook (games/DESIGN.md 6.6)
//   names               names(content) → { kind: Set }: what the content defines that its schema names (S.name)
//   languages           { lang: (text) → why it cannot be read, or null }: the readers of the vocabulary's languages
//                       (schema.js syntax), one for each it names
export const EXTENSIONS = {
  names: isFn,
  languages: (l) => Boolean(l) && typeof l === 'object' && Object.values(l).every(isFn),
  play: (p) => Boolean(p) && isFn(p.open) && isFn(p.attempt),
}

const isText = (v) => typeof v === 'string' || (v && (typeof v.en === 'string' || typeof v.zh === 'string'))

export function runtimeProblems(name, runtime) {
  const out = []
  if (!runtime || typeof runtime !== 'object') return [`${name}: runtime.js has no default export`]
  for (const key of ENTRIES) if (!runtime[key]) out.push(`${name}: runtime.js gives no ${key}`)
  if (runtime.prepare && !isFn(runtime.prepare)) out.push(`${name}: prepare is not a function`)
  if (runtime.spec && !isFn(runtime.spec)) out.push(`${name}: spec is not a function`)
  if (runtime.validate && !isFn(runtime.validate)) out.push(`${name}: validate is not a function`)
  for (const key of Object.keys(runtime)) if (!ENTRIES.includes(key) && !(key in EXTENSIONS)) out.push(`${name}: runtime.js gives ${key}, which is no entry of the contract`)
  for (const [key, fits] of Object.entries(EXTENSIONS)) if (key in runtime && !fits(runtime[key])) out.push(`${name}: ${key} has not the shape its extension point asks for`)
  if (runtime.vocabulary) out.push(...vocabularyProblems(name, runtime.vocabulary))
  const named = Object.keys(runtime.vocabulary?.languages ?? {})
  const read = Object.keys(runtime.languages ?? {})
  for (const lang of named) if (!read.includes(lang)) out.push(`${name}: the vocabulary names the language ${lang}, which runtime.js does not read`)
  for (const lang of read) if (!named.includes(lang)) out.push(`${name}: runtime.js reads ${lang}, which the vocabulary does not name`)
  return out
}

/** Every schema inside a schema, with its path. */
function* schemasIn(s, at) {
  if (!s || typeof s !== 'object') return
  yield [s, at]
  if (s.of) for (const [k, x] of (Array.isArray(s.of) ? s.of : [s.of]).entries()) yield* schemasIn(x, `${at}${Array.isArray(s.of) ? `|${k}` : '[]'}`)
  if (s.fields) for (const [k, x] of Object.entries(s.fields)) yield* schemasIn(x, `${at}.${k}`)
  if (s.cases) for (const [k, x] of Object.entries(s.cases)) yield* schemasIn(x, `${at}<${k}>`)
}

// The schema types are what schema.js makes (opt is a flag on another type, not a type of its own).
const TYPES = Object.keys(S).filter((k) => k !== 'opt')

export function vocabularyProblems(name, v) {
  const out = []
  const say = (text) => out.push(`${name}: vocabulary: ${text}`)
  if (v.module !== name) say(`it is ${v.module}'s, in the folder ${name}`)
  if (!Number.isInteger(v.version) || v.version < 1) say(`version ${v.version} is no whole number from 1`)
  if (!v.kinds || !Object.keys(v.kinds).length) say('it has no kinds')
  const schemas = [['game', v.game], ['level', v.level]]
  for (const [kind, items] of Object.entries(v.kinds ?? {})) {
    // A module may use only capabilities registered by its dependencies.
    if (!Object.keys(items).length && kind !== 'op') say(`the kind ${kind} has no items`)
    for (const [item, it] of Object.entries(items)) {
      if (!isText(it.about)) say(`${kind}.${item} says nothing of what it is (about)`)
      if (it.params) schemas.push([`${kind}.${item}`, it.params])
      if (kind === 'op' && !(Array.isArray(it.args) && it.args.every((a) => typeof a?.name === 'string'))) say(`op.${item} lists no arguments (args: [{ name }])`)
      if (kind === 'op' && it.params && it.params.type !== 'obj') say(`op.${item}: its named parameters are an S.obj`)
    }
  }
  // A level is a list of tasks (tasks.js taskLevel), and what a player keeps of a task goes by its id: a level's tasks,
  // whatever their shape, each have one.
  const tasks = v.level ? tasksSchema(v) : null
  if (v.level && !tasks) say('a level is a list of tasks (tasks.js taskLevel)')
  if (tasks && taskShapes(tasks).some((shape) => !shape.fields?.id || shape.fields.id.optional)) say('a level’s tasks need an id each (tasks.js TASK_ID_FIELD)')
  for (const [lang, it] of Object.entries(v.languages ?? {})) if (!isText(it?.about)) say(`the language ${lang} says nothing of what it is (about)`)
  for (const r of v.removes ?? []) if (typeof r?.at !== 'string' || !isText(r.why)) say(`a removal says not where (at) or why (why): ${JSON.stringify(r)}`)
  for (const [where, schema] of schemas) {
    if (!schema) { say(`no ${where} schema`); continue }
    for (const [s, at] of schemasIn(schema, where)) {
      if (!TYPES.includes(s.type)) say(`${at}: ${JSON.stringify(s.type)} is no schema type`)
      // Typed resources come from the vocabulary and installed declarations.
      if (s.type === 'syntax' && !v.languages?.[s.lang]) say(`${at}: names the language ${s.lang}, which the vocabulary has not`)
      if ((s.type === 'ref' || s.type === 'call') && !v.kinds?.[s.kind] && !s.reference) say(`${at}: names the kind ${s.kind}, which the vocabulary has not`)
      for (const [hint, values] of Object.entries(HINTS)) if (s[hint] !== undefined && !values.includes(s[hint])) say(`${at}: ${hint} ${JSON.stringify(s[hint])} is none of ${values.join(', ')}`)
    }
  }
  // Code anywhere in it would be lost on printing (describe): it must be data all through.
  const code = []
  const walk = (x, at) => {
    if (typeof x === 'function' || typeof x === 'symbol' || typeof x === 'bigint' || (typeof x === 'number' && !Number.isFinite(x))) code.push(at)
    else if (x && typeof x === 'object') for (const [k, y] of Object.entries(x)) walk(y, `${at}.${k}`)
  }
  walk(v, 'vocabulary')
  for (const at of code.slice(0, 5)) say(`${at} is not data`)
  if (!code.length && !sameJson(describe(v), v)) say('it does not print as itself')
  return out
}

/** Object meanings own contracts for their work formats and derived models. */
export function specProblems(domain, content, spec) {
  return meaningsOf(contentSchemas.get(content)).flatMap(meaning => meaning.contract?.spec(domain, content, spec) ?? [])
}
export async function validateProblems(domain, content, spec) {
  const results = await Promise.all(meaningsOf(contentSchemas.get(content)).map(meaning => meaning.contract?.validate(domain, content, spec)).filter(Boolean))
  return { problems: results.flatMap(result => result.problems), builders: results.flatMap(result => result.builders), runsOwn: results.flatMap(result => result.runsOwn) }
}

/** The game game.js makes of a content (the shell's description, ../shell/index.js defineGame) against the spec. */
export function gameProblems(content, spec, game) {
  const out = []
  const say = (text) => out.push(`game.js: ${text}`)
  if (game.id !== content.id) say(`id ${game.id}, the content's is ${content.id}`)
  for (const key of ['title', 'kicker', 'lede']) if (!isText(game[key])) say(`no ${key}`)
  if (!Array.isArray(game.chapters) || !Array.isArray(game.levels)) return [...out, 'game.js: no chapters or no levels']
  if (!sameJson(game.levels.map((l) => l.id), spec.levels.map((l) => l.id))) say('its levels are not the spec’s, in play order')
  const chapters = new Set(game.chapters.map((c) => c.id))
  for (const l of game.levels) {
    if (!game.kinds?.[l.kind] || !isFn(game.kinds[l.kind].Screen)) say(`${l.id}: the kind ${l.kind} has no Screen`)
    for (const task of l.tasks ?? []) {
      const chosen = playId({ ...l, ...task })
      if (!isFn(game.kinds?.[chosen]?.Screen)) say(`${l.id}/${task.key}: the play ${chosen} has no Screen`)
    }
    if (!chapters.has(l.chapter)) say(`${l.id}: in no chapter`)
  }
  if (!sameJson(game.glossary, content.glossary)) say('its encyclopedia is not the content’s glossary')
  return out
}

/** A module's registered capabilities are qualified, printable and type-complete. */
export function moduleProblems(module, registry, runtime = null) {
  const out = []
  const prefix = `${module.id}:`
  if (typeof module.register !== 'function') return [`${module.id}: no register function`]
  let count = 0
  const types = registry.tables.valueType
  const declaredType = (type) => (Array.isArray(type) ? type.every((t) => declaredType(t)) : Boolean(types[type]))
  for (const [kind, table] of Object.entries(registry.tables)) for (const [name, item] of Object.entries(table)) {
    if (!name.startsWith(prefix)) continue
    count++
    if (!isText(item.about)) out.push(`${name}: missing description`)
    if (!sameJson(JSON.parse(JSON.stringify(item)), item)) out.push(`${name}: capability is not printable data`)
    if (kind === 'valueType') for (const type of item.accepts ?? []) if (!declaredType(type)) out.push(`${name}: accepts unknown value type ${type}`)
    if (kind === 'board') for (const type of item.valueTypes ?? []) if (!declaredType(type)) out.push(`${name}: board uses unknown value type ${type}`)
    if (kind === 'primitive') {
      for (const port of item.inputs ?? []) if (typeof port === 'object' && !declaredType(port.type)) out.push(`${name}: port ${port.name} has unknown value type ${port.type}`)
      if (item.outputType && !declaredType(item.outputType)) out.push(`${name}: unknown output type ${item.outputType}`)
    }
    if (kind === 'display' && (item.role || ['display', 'widget'].includes(item.kind))) {
      const entry = registry.displayLoaders[name]
      if (!entry) out.push(`${name}: no display implementation`)
      else if (!entry.startsWith(`../modules/${module.id}/ui/`) && entry !== `${module.id}/view`) out.push(`${name}: display implementation is outside its module UI`)
    }
    if (kind === 'operation' && !registry.operations[name]) out.push(`${name}: no runtime implementation`)
    if (kind === 'operation' && item.signatures && !item.signatures.length) out.push(`${name}: no signatures`)
    if (kind === 'operation') for (const signature of item.signatures ?? [item]) {
      if (!Array.isArray(signature.args)) out.push(`${name}: no argument signature`)
      if (!signature.params) out.push(`${name}: no parameter declaration`)
      for (const arg of signature.args ?? []) if (!declaredType(arg.type)) out.push(`${name}: argument ${arg.name} has unknown value type ${arg.type}`)
      if (!declaredType(signature.returns)) out.push(`${name}: unknown result type ${signature.returns}`)
      if (signature.params && signature.params.type !== 'obj') out.push(`${name}: parameters must be an object schema`)
      for (const [key, schema] of Object.entries(signature.params?.fields ?? {})) if (schema.default !== undefined) {
        for (const problem of fits(schema, schema.default)) out.push(`${name}.${key}: invalid default: ${problem.says}`)
      }
    }
  }
  if (runtime) out.push(...runtimeProblems(module.id, runtime))
  if (!count) out.push(`${module.id}: registers no capabilities`)
  return out
}
