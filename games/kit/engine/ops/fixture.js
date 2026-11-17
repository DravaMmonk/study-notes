import { kernelIdentity } from '../release-data.js'
import { lockTarget } from '../releases.js'
import { folders } from '../layers.js'
import { contentKindSchemas } from '../content-kinds.js'
import { objectFiles, packageIds, contentTargets, resolveLayers } from '../resolver.js'
// A games folder written for the tools' end-to-end tests (../../app/studio.test.js, mcp.test.js): a hub list
// (games.js) and one small data game on the logic domain, three proof levels of its own, so the tests never touch a
// real game (games/DESIGN.md: unit tests never read a real game's levels). Each call writes a fresh folder.
//
//   proofsRoot() → { root, id }   the games folder (in the system's temp folder) and the game's id
//
// The game: `given` (the given is the goal), `apply` (two Applies in a row), `suppose` (an assumption box around them);
// every brief and hint in everyday words, the English side naming “Saturday” and “Assume” for search and replace.
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync, cpSync, existsSync, readdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { catalogsOf, normalizeText } from '../content-text.js'
import { catalogReader, sourceValue } from '../catalogs.js'
import { configurationFiles } from '../content.js'
import { GLOSSARY as GLOSSARY_SCHEMA } from '../vocabulary.js'
import { OBJECT_SCHEMAS } from '../objects.js'
import { PARTS_FILE } from '../../../../packages/circuit/core/index.js'
import { withParts } from '../../../../packages/circuit/core/index.js'
import { expandNames } from '../names.js'
import { readCatalogs, contentVocabulary } from '../resolver.js'

const T = (en) => ({ en })

const ID = 'proofs'

const GAME = {
  vocabulary: 1,
  title: T('Proofs · Test'),
  kicker: T('Test'),
  lede: T('Proofs built from Apply and the assumption box.'),
  words: ['everyday'],
  contentObjects: { wordset: {
    everyday: {
      Rain: T('it rains'),
      Wet: T('the ground is wet'),
      Slip: T('the road is slippery'),
      Sat: T('today is Saturday'),
      Rest: T('I rest'),
    },
  } },
  primitives: ['mp', 'impI'],
  chapters: [{
    id: 'ground',
    machine: 'prover',
    levels: ['given', 'apply', 'suppose'],
    chapter: { title: T('The foundation'), question: T('What can be built from Apply and the assumption box alone?') },
  }],
}
const proofVocabulary = contentVocabulary('logic')

const GLOSSARY = {
  groups: [{ id: 'logic', title: T('Logic') }],
  entries: [{
    id: 'proof',
    group: 'logic',
    title: T('proof'),
    at: 'given',
    body: [T('A board that wires the givens, step by step, to the goal.')],
  }],
}

// Its parts: Apply, the assumption box and the implication key.
const PARTS = {

  parts: {
    mp: { name: T('套用', 'Apply'), desc: T('由 A → B 和 A 得到 B。', 'From A → B and A, B.'), icon: 'GitFork', family: 'logic:family-rule', outputType: 'logic:judgment', inputs: [{ name: 'imp', type: 'logic:judgment', label: T('A → B') }, { name: 'a', type: 'logic:judgment', label: T('A') }], op: 'logic:mp' },
    impI: { name: T('假设框', 'Assumption box'), desc: T('框里假设 A，证出 B，得到 A → B。', 'Assume A inside, prove B, get A → B.'), icon: 'Box', family: 'logic:family-box', outputType: 'logic:judgment', inputs: [], settings: { 'A': { control: 'tree', label: T('假设', 'Assume') } }, regions: [{ name: 'body', type: 'logic:judgment', label: T('框内', 'Inside'), opens: true, closes: true }], op: 'logic:impI' },
  },
}
const LEVELS = {
  given: {
    title: T('Copy'),
    intro: [{ t: T('The given is on the left, the goal on the right; one wire is a <wiki-ref to="proof"></wiki-ref>.') }],
    after: T('A given is already a proof of itself.'),
    tasks: [{
      id: 'given',
      kind: 'logic:proof',
      tests: [{ premises: { p: 'A' }, goal: 'A' }],
      cases: [{ A: 'Sat' }, { A: 'Rain' }],
      solution: ['goal <- p'],
      brief: T('Given that “today is Saturday”, prove that “today is Saturday”.'),
      hint: [T('Wire the given to the goal.')],
    }],
  },
  apply: {
    title: T('Apply'),
    adds: ['mp', 'formulaImplies'],
    after: T('Apply looks only at shape.'),
    tasks: [{
      id: 'apply',
      kind: 'logic:proof',
      tests: [{ premises: { p: 'A → B', q: 'B → C', r: 'A' }, goal: 'C' }],
      cases: [{ A: 'Rain', B: 'Wet', C: 'Slip' }],
      brief: T('Given “it rains → the ground is wet”, “the ground is wet → the road is slippery” and “it rains”, prove “the road is slippery”.'),
      hint: [T('The first Apply gives “the ground is wet”.')],
      solution: ['m1 = mp(p, r)', 'm2 = mp(q, m1)', 'goal <- m2'],
    }],
  },
  suppose: {
    title: T('Suppose'),
    adds: ['impI'],
    after: T('To prove an “if … then …”, assume its first half.'),
    tasks: [{
      id: 'suppose',
      kind: 'logic:proof',
      tests: [{ premises: { p: 'A → B', q: 'B → C' }, goal: 'A → C' }],
      cases: [{ A: 'Sat', B: 'Rain', C: 'Rest' }],
      brief: T('Given “today is Saturday → it rains” and “it rains → I rest”, prove “today is Saturday → I rest”.'),
      hint: [T('On the box, set “Assume” to “today is Saturday”.')],
      solution: ['f = impI[A=A](body: m2) {', '  body {', '    m1 = mp(p, f.body)', '    m2 = mp(q, m1)', '  }', '}', 'goal <- f'],
    }],
  },
}

/** Write a temporary game (its course) and package in the same format as checked-in content. */
export function writeContentFixture(root, id, { game: sourceGame, glossary, partDefs, levels, tags = {}, relations = {}, sections = {}, trays = {} }, domainVocabulary) {
  const { contentObjects = {}, ...game } = sourceGame
  const course = join(root, 'games', id)
  const pkg = join(root, 'packages', id)
  mkdirSync(course, { recursive: true })
  mkdirSync(join(pkg, 'levels'), { recursive: true })
  const put = (file, value) => writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`)
  const putCatalogs = (dir, ...values) => {
    mkdirSync(join(dir, 'i18n'), { recursive: true })
    for (const [lang, entries] of Object.entries(catalogsOf(dir, ...values))) put(join(dir, 'i18n', `${lang}.json`), entries)
  }
  if (id !== 'circuit') installCircuitFixture(root)
  const vocabulary = withParts(domainVocabulary, partDefs)
  const normalize = (value, schema, prefix) => normalizeText(value, schema, prefix, { vocabulary })
  const gameText = normalize(game, vocabulary.game, 'course')
  const { 'game.json': shell, 'course.json': route } = configurationFiles(gameText)
  const glossaryText = normalize(glossary, GLOSSARY_SCHEMA, 'glossary')
  const partsText = partDefs === undefined ? undefined : normalize(partDefs, PARTS_FILE, 'parts')
  const levelText = Object.entries(levels).map(([level, value]) => [level, normalize(value, vocabulary.level, `level.${level}`)])
  const objectText = Object.entries({ tags, relations, sections, trays }).flatMap(([kind, values]) => Object.entries(values).map(([name, value]) => [kind, name, normalize(value, kind === 'trays' ? JSON.parse(readFileSync(new URL('../../../../packages/circuit/kinds/tray.json', import.meta.url))).schema : OBJECT_SCHEMAS[kind], `${kind}.${name}`)]))
  put(join(course, 'game.json'), { kernel: `^${kernelIdentity().version}`, packages: { [id]: '^0.0.0', circuit: '^0.0.0' }, ...sourceValue(shell) })
  put(join(course, 'course.json'), sourceValue(expandNames(route, id, { parts: new Set(Object.keys(partDefs?.parts ?? {})), schema: vocabulary.game, vocabulary, context: 'configuration', textKeys: false })))
  put(join(pkg, 'package.json'), { version: '0.0.0', kernel: `^${kernelIdentity().version}`, uses: { circuit: '^0.0.0' } })
  mkdirSync(join(pkg, 'entries'), { recursive: true })
  for (const { id, group: _group, ...entry } of glossaryText.entries) put(join(pkg, 'entries', `${id}.json`), sourceValue(entry))
  mkdirSync(join(pkg, 'tags/entry'), { recursive: true })
  for (const { id, ...group } of glossaryText.groups) put(join(pkg, 'tags/entry', `${id}.json`), { ...sourceValue(group), values: glossaryText.entries.filter((e) => e.group === id).map((e) => e.id) })
  mkdirSync(join(pkg, 'parts'), { recursive: true })
  for (const [name, part] of Object.entries(partsText?.parts ?? {})) put(join(pkg, 'parts', `${name}.json`), sourceValue(part))
  for (const [level, value] of levelText) put(join(pkg, 'levels', `${level}.json`), sourceValue(value))
  for (const [kind, name, value] of objectText) {
    const folder = kind === 'tags' ? `${kind}/${value.kind}` : kind
    mkdirSync(join(pkg, folder), { recursive: true })
    const { kind: _kind, ...tag } = value
    put(join(pkg, folder, `${name}.json`), sourceValue(kind === 'tags' ? tag : value))
  }
  putCatalogs(course, shell, route)
  const extra = Object.entries(contentObjects).flatMap(([kind, values]) => Object.entries(values).map(([name, value]) => [kind, name, normalize(value, contentKindSchemas[kind], `${kind}.${name}`)]))
  for (const [kind, name, value] of extra) { mkdirSync(join(pkg, folders[kind]), { recursive: true }); put(join(pkg, folders[kind], `${name}.json`), sourceValue(value)) }
  putCatalogs(pkg, ...extra.map(([, , value]) => value), glossaryText, partsText, ...levelText.map(([, value]) => value), ...objectText.map(([, , value]) => value))
  lockTarget({ kind: 'package', id }, root)
  lockTarget({ kind: 'game', id }, root)
}

export function proofsRoot() {
  const root = mkdtempSync(join(tmpdir(), 'games-'))
  writeContentFixture(root, ID, { game: { ...GAME, contentObjects: { ...GAME.contentObjects, symbol: { formulaImplies: { mark: 'logic:mark-formulaImplies', icon: 'Rows3', name: '→', desc: T('Implication') } } } }, glossary: GLOSSARY, partDefs: PARTS, levels: LEVELS, relations: { path: { kind: 'requires', edges: [{ from: 'given', to: 'apply' }, { from: 'apply', to: 'suppose' }] }, sequence: { kind: 'order', of: 'level', sequence: ['given', 'apply', 'suppose'] } } }, proofVocabulary)
  writeFileSync(join(root, 'games', 'games.js'), `export const GAMES = [\n  {\n    id: '${ID}', levels: ${Object.keys(LEVELS).length},\n  },\n]\n`)
  return { root, id: ID }
}

/** Source definitions for unit tests that compose their own small content over the starter's resources. */
export function starterParts(domainDir) {
  const dir = join(domainDir, 'starter')
  return { parts: Object.fromEntries(objectFiles(dir, 'parts').map(([name, file]) => [name, catalogReader(readCatalogs(join(dir, 'i18n/package')))(JSON.parse(readFileSync(file, 'utf8')))])) }
}

/** Seal the dependencies of a completed synthetic project before invoking production readers. */
export function lockFixture(root) {
  installCircuitFixture(root)
  for (const id of packageIds(root).filter(id => id !== 'circuit')) {
    const file = join(root, 'packages', id, 'package.json')
    const config = JSON.parse(readFileSync(file))
    const dir = join(root, 'packages', id)
    const legacy = ['parts', 'trays'].some(folder => existsSync(join(dir, folder))) || objectFiles(dir, 'levels').some(([, file]) => JSON.parse(readFileSync(file)).tasks?.some(task => !task.play))
    if (legacy) { config.uses = { ...config.uses, circuit: '^0.0.0' }; writeFileSync(file, JSON.stringify(config, null, 2) + '\n') }
  }
  const games = join(root, 'games')
  for (const id of existsSync(games) ? readdirSync(games) : []) {
    const file = join(games, id, 'game.json')
    if (!existsSync(file)) continue
    const game = JSON.parse(readFileSync(file))
    game.packages = { ...game.packages, circuit: '^0.0.0' }; game.kernel = `^${kernelIdentity().version}`
    writeFileSync(file, JSON.stringify(game, null, 2) + '\n')
  }
  for (const id of packageIds(root)) {
    const file = join(root, 'packages', id, 'package.json')
    const config = JSON.parse(readFileSync(file)); config.kernel = `^${kernelIdentity().version}`
    writeFileSync(file, JSON.stringify(config, null, 2) + '\n')
  }
  for (const id of resolveLayers({ packages: packageIds(root), closure: true, root, unlocked: true }).layers.map(layer => layer.id)) lockTarget({ kind: 'package', id }, root)
  for (const target of contentTargets([], root, { game: true })) lockTarget(target, root)
}

// Synthetic projects reuse mechanism declarations, without authored course content.
export function installCircuitFixture(root) {
  const dir = join(root, 'packages', 'circuit')
  if (existsSync(join(dir, 'package.json'))) return
  mkdirSync(dir, { recursive: true })
  for (const folder of ['kinds', 'i18n']) cpSync(new URL(`../../../../packages/circuit/${folder}`, import.meta.url), join(dir, folder), { recursive: true })
  writeFileSync(join(dir, 'package.json'), JSON.stringify({ version: '0.0.0', kernel: `^${kernelIdentity().version}`, uses: {} }, null, 2) + '\n')
}

export const circuitFixtureKinds = {
  'circuit/part': { folder: 'parts', schema: { type: 'any' } },
  'circuit/tray': { folder: 'trays', schema: { type: 'obj', fields: {
    title: { type: 'text', optional: true }, values: { type: 'list', of: { type: 'str', reference: 'grant' } },
    menus: { type: 'list', optional: true, of: { type: 'obj', fields: {
      id: { type: 'str', reference: 'menu' }, title: { type: 'text', optional: true }, values: { type: 'list', of: { type: 'str', reference: 'grant' } },
    } } },
  } }, override: 'append' },
}
export const circuitFixtureSchema = schemas => ({ ...schemas, objectKinds: { ...circuitFixtureKinds, ...schemas.objectKinds } })
