// Core object schemas and environment-neutral vocabulary descriptions.
import { S } from './schema.js'
export const ENTRY = S.obj({ title: S.text(), aliases: S.opt(S.list(S.text(), { min: 1 })), body: S.list(S.text()), at: S.opt(S.level()), see: S.opt(S.list(S.name('entry'))) })

/** A game's encyclopedia (the shell's glossary): groups, and entries opening at a level (`at`) and linking others. */
export const GLOSSARY = S.obj({
  englishNamesInChinese: S.opt(S.bool()),
  groupByChapter: S.opt(S.bool()),
  groups: S.list(S.obj({ id: S.str(), title: S.text(), values: S.opt(S.list(S.name('entry'))) })),
  entries: S.list(S.obj({ id: S.str(), group: S.opt(S.name('group')), title: S.text(), aliases: S.opt(S.list(S.text(), { min: 1 })), body: S.list(S.text()), at: S.opt(S.level()), see: S.opt(S.list(S.name('entry'))) })),
})

/**
 * The audit findings a game.json leaves open (`open`): { rule: ['part@level'] }, the findings of the course audit
 * (../course.js) its curriculum has not met yet, each on the work list in the game's design doc. npm run check lists them
 * without failing, and fails on any other finding and on one listed that is gone.
 */
export const OPEN = S.map(S.list(S.str({ pattern: '^(?:@?[a-z][a-z0-9-]*/)?[^@]*@(?:@?[a-z][a-z0-9-]*/)?[^@]+$' })))


export function defineVocabulary({ module, kinds, game, level, languages = {} }) {
  return { module, kinds, game, level, languages }
}

/** The vocabulary as plain data: its kinds and items with what they are and their parameters, and the content schemas. */
export const describe = (vocabulary) => JSON.parse(JSON.stringify(vocabulary.description ?? vocabulary))
