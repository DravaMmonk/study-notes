// A domain's vocabulary: everything content may name (games/DESIGN.md 6.2). Content is data made of the vocabulary's
// items and their parameters, and nothing else; whatever it needs that the vocabulary lacks is a new item, written in
// the domain (code, under review), never worked around in the content.
//
// defineVocabulary({
//   domain    the domain's id ('table')
//   version   raised whenever an item is added; an item never goes away without a save and content migration
//   kinds     { kind: { item: { about, params? } } }   about: what the item is, { zh, en }; params: its schema
//             (schema.js), absent for an item that takes none
//   game      the schema of a game's game.json
//   level     the schema of one level (levels/<id>.json; its id is the file's name)
// })
import { S, validate } from './schema.js'
import { BLUEPRINT } from '../pipeline/blueprint.js'
import { taskIdProblems } from './tasks.js'

/** A game's encyclopedia (the shell's glossary): groups, and entries opening at a level (`at`) and linking others. */
export const GLOSSARY = S.obj({
  groups: S.list(S.obj({ id: S.str(), title: S.text() })),
  entries: S.list(S.obj({ id: S.str(), group: S.str(), title: S.text(), aliases: S.opt(S.list(S.text(), { min: 1 })), body: S.list(S.text()), at: S.opt(S.level()), see: S.opt(S.list(S.str())) })),
})

/**
 * The audit findings a game.json leaves open (`open`): { rule: ['part@level'] }, the findings of the course audit
 * (../course.js) its curriculum has not met yet, each on the work list in the game's design doc. npm run check lists them
 * without failing, and fails on any other finding and on one listed that is gone.
 */
export const OPEN = S.map(S.list(S.str({ pattern: '^[^@]*@[^@]+$' })))

/**
 * game.json's `saves`, the same in every game: the save migration steps the operation set writes (ops/migrate.js),
 * each a version, why it was written, and the shell's save operations (../shell/saves.js) — level ids renamed or gone,
 * levels counted solved, boards made a part's, boards dropped, task ids renamed.
 */
const LEVEL_OR_NONE = S.either(S.str(), S.oneOf([null]))
export const SAVES = S.list(S.obj({
  version: S.int({ min: 2 }),
  why: S.opt(S.str()),
  ops: S.list(S.either(
    S.obj({ rename: S.map(LEVEL_OR_NONE) }),
    S.obj({ solve: S.list(S.either(S.str(), S.list(S.str()))) }),
    S.obj({ built: S.list(S.list(S.str(), { min: 2 })) }),
    S.obj({ drop: S.list(S.str()) }),
    S.obj({ retask: S.map(S.str()) }),
  )),
}))

export function defineVocabulary({ domain, version, kinds, game, level }) {
  return { domain, version, kinds, game, level }
}

/** The vocabulary as plain data: its kinds and items with what they are and their parameters, and the content schemas. */
export const describe = (vocabulary) => JSON.parse(JSON.stringify(vocabulary))

/**
 * Every place a game's content (content.js assemble) does not fit its domain's vocabulary, as [{ at, says }]: the
 * file and the path in it. A course blueprint (blueprint.json) is the kernel's, the same in every domain; so is the rule
 * that task ids are unique in a game and never another level's (tasks.js).
 */
export function checkContent(vocabulary, content) {
  const out = []
  const add = (problems, file) => out.push(...problems.map((p) => ({ at: `${file}${p.at === '(root)' ? '' : p.at}`, says: p.says })))
  // The fields every game.json has: which domain plays it and the version of its vocabulary it was written for; and
  // the one it may have: the audit findings it leaves open.
  const { id, levels, glossary, domain, vocabulary: version, open, blueprint, ...game } = content
  const ids = new Set(levels.map((l) => l.id))
  if (domain !== vocabulary.domain) out.push({ at: 'game.json.domain', says: `the vocabulary is ${vocabulary.domain}'s, not ${domain}'s` })
  if (!Number.isInteger(version) || version > vocabulary.version) out.push({ at: 'game.json.vocabulary', says: `written for version ${version}; the domain's vocabulary is version ${vocabulary.version}` })
  add(validate(vocabulary.game, game, { vocabulary, levels: ids }), 'game.json')
  if (open !== undefined) add(validate(OPEN, open, { vocabulary }), 'game.json.open')
  for (const { id: levelId, ...level } of levels) add(validate(vocabulary.level, level, { vocabulary, levels: ids }), `levels/${levelId}.json`)
  out.push(...taskIdProblems(levels))
  add(validate(GLOSSARY, glossary, { vocabulary, levels: ids }), 'glossary.json')
  if (blueprint !== undefined) add(validate(BLUEPRINT, blueprint, { vocabulary }), 'blueprint.json')
  return out
}
