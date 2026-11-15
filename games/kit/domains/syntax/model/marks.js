// What a block on the strip can mark in a sentence (vocabulary.js `mark`): the syntax domain's rules, the same in every
// game on the domain. A role of the skeleton marks a stretch of the sentence, whose standing words are checked against
// the answer's by its head word, or whole; a construction folds a modifier into one piece and hangs it on the word it
// modifies, outside it. A game's blocks are pieces of its pieces.json (the strip editor's, games/DESIGN.md 6.8): each
// stands for one mark, with the name, description and icon the game gives it.
import { markOf } from '../../../engine/pieces.js'
import { T } from '../../../shell/i18n.js'

/** Each mark: what it is; a role (`role`: checked by its 'head' or 'whole', `needed`: every sentence marks one), or a construction (`fold`). */
export const MARKS = {
  subj: { about: T('主语：主干里句子说的是谁、是什么，按中心词对照；每句都有'), role: 'head', needed: true },
  verb: { about: T('谓语：主干里主语做什么、怎么样，立着的词一个不差；每句都有'), role: 'whole', needed: true },
  obj: { about: T('宾语：主干里动作落到的东西，按中心词对照'), role: 'head' },
  comp: { about: T('表语：主干里系动词后面说明主语的成分，按中心词对照'), role: 'head' },
  pp: { about: T('介词短语：折成一块，挂到它修饰的词上'), fold: true },
  rel: { about: T('定语从句：折成一块，挂到它修饰的词上'), fold: true },
}

/** A game's blocks from its pieces.json, in the file's order: { type: { name, desc, mark, role? | fold?, needed? } }. */
export function chipsOf(file) {
  return Object.fromEntries(Object.entries(file?.parts ?? {}).map(([type, piece]) => {
    const { about: _, ...rule } = MARKS[markOf(piece)] ?? {}
    return [type, { name: piece.name, desc: piece.desc, mark: markOf(piece), ...rule }]
  }))
}
