import { folders } from '../layers.js'
import { contentKindSchemas } from '../content-kinds.js'
import { objectFiles } from '../resolver.js'
// A games folder written for the tools' end-to-end tests (../../app/studio.test.js, mcp.test.js): a hub list
// (games.js) and one small data game on the logic domain, three proof levels of its own, so the tests never touch a
// real game (games/DESIGN.md: unit tests never read a real game's levels). Each call writes a fresh folder.
//
//   proofsRoot() → { root, id }   the games folder (in the system's temp folder) and the game's id
//
// The game: `given` (the given is the goal), `apply` (two Applies in a row), `suppose` (an assumption box around them);
// every brief and hint in everyday words, the English side naming “Saturday” and “Assume” for search and replace.
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { catalogsOf, normalizeText } from '../content-text.js'
import { catalogReader, sourceValue } from '../catalogs.js'
import { configurationFiles } from '../content.js'
import { GLOSSARY as GLOSSARY_SCHEMA } from '../vocabulary.js'
import { OBJECT_SCHEMAS } from '../objects.js'
import { PARTS_FILE } from '../parts/schema.js'
import { withParts } from '../parts/define.js'
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
  const vocabulary = withParts(domainVocabulary, partDefs)
  const normalize = (value, schema, prefix) => normalizeText(value, schema, prefix, { vocabulary })
  const gameText = normalize(game, vocabulary.game, 'course')
  const { 'game.json': shell, 'course.json': route, ...config } = configurationFiles(gameText)
  const glossaryText = normalize(glossary, GLOSSARY_SCHEMA, 'glossary')
  const partsText = partDefs === undefined ? undefined : normalize(partDefs, PARTS_FILE, 'parts')
  const levelText = Object.entries(levels).map(([level, value]) => [level, normalize(value, vocabulary.level, `level.${level}`)])
  const objectText = Object.entries({ tags, relations, sections, trays }).flatMap(([kind, values]) => Object.entries(values).map(([name, value]) => [kind, name, normalize(value, OBJECT_SCHEMAS[kind], `${kind}.${name}`)]))
  put(join(course, 'game.json'), { packages: [id], ...sourceValue(shell) })
  put(join(course, 'course.json'), sourceValue(expandNames(route, id, { parts: new Set(Object.keys(partDefs?.parts ?? {})), schema: vocabulary.game, vocabulary, context: 'configuration', textKeys: false })))
  for (const [file, value] of Object.entries(config)) put(join(pkg, file), sourceValue(value))
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
  putCatalogs(pkg, ...extra.map(([, , value]) => value), ...Object.values(config), glossaryText, partsText, ...levelText.map(([, value]) => value), ...objectText.map(([, , value]) => value))
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
