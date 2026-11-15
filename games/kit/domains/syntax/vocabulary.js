// The syntax domain's vocabulary (games/DESIGN.md 6.2): every thing a syntax game's content may name, each with what it
// is and the schema of its parameters, and the schemas of game.json and of one level. Content is these items and
// their parameters, and nothing else: whatever a level needs that is not here is a new item, written in this domain.
//
// The items are implemented next to them: the marks (the skeleton's roles and the constructions a modifier is folded
// as, what a game's blocks stand for) in model/marks.js, a sentence and its answer in model/sentence.js. A game's
// blocks are pieces of its pieces.json (the strip editor's, games/DESIGN.md 6.8); content names them as parts
// (S.ref('part'), ../../engine/parts/define.js withParts).

import { S } from '../../engine/schema.js'
import { defineVocabulary } from '../../engine/vocabulary.js'
import { taskLevel } from '../../engine/tasks.js'
import { TRAY, TRAYS } from '../../engine/trays.js'
import { MARKS } from './model/marks.js'
import { T as t } from '../../shell/i18n.js'

const item = (about, params) => ({ about, ...(params ? { params } : {}) })
const TEXTS = S.list(S.text())

/* ---------- the marks, the machine ---------- */

/** What a block on the strip marks: a role of the skeleton or a construction (model/marks.js). */
const MARK_ITEMS = Object.fromEntries(Object.entries(MARKS).map(([mark, { about }]) => [mark, item(about)]))
const MACHINES = {
  reader: item(t('读者：标出主干，把修饰成分折到它修饰的词上')),
}

/* ---------- a level ---------- */

/** A phrase as it stands in the sentence; one that occurs more than once is told apart with #n ('change#2'). */
const PHRASE = S.str({ about: t('句子里的一段词，出现不止一次时写 #n（change#2）') })
// A block of the game's pieces.json: what a fold is folded as, what a role is marked as.
const BLOCK = S.ref('part')
const FOLD = S.obj({
  span: PHRASE,
  type: S.ref('part', { about: t('折成的结构：标出一种结构的块') }),
  to: PHRASE,
  misread: S.opt(S.map(S.text(), { about: t('挂在别的词（键）上时，那样挂是什么意思') })),
})
const ROLES = S.map(PHRASE, { key: BLOCK, about: t('主干的每个成分（标出它的块）是句子里的哪段词') })
const MISROLE = S.map(S.map(S.text(), {
  about: t('标成这个成分、还立着的那几个词（小写）标错时说什么；* 是这句话根本没有这个成分'),
}), { key: BLOCK })
/** One sentence and its answer, in words (model/sentence.js resolve reads them into indices). */
const SENTENCE = {
  sentence: S.str(),
  folds: S.opt(S.list(FOLD)),
  roles: ROLES,
  misrole: S.opt(MISROLE),
  given: S.opt(S.list(PHRASE, { about: t('已经折好、拆不开的块（答案里的折）') })),
}
const INTRO = S.list(S.obj({ t: S.text() }))
/** What a level says once: its title, its place in the course, its introduction, its pass text. */
const ONCE = {
  title: S.text(),
  adds: S.opt(S.list(BLOCK, { section: 'course', about: t('这一关带来的成分或结构') })),
  tray: TRAY,
  showcase: S.opt(S.text({ section: 'course', about: t('新东西第一次出现时只用它一个也算一关：它的用法抽象在哪里') })),
  intro: S.opt(INTRO),
  debrief: S.obj({ title: S.text(), body: TEXTS, note: S.opt(S.text()) }),
}
/** A task: one sentence to take apart, its brief and hints; several are done in turn, the last one the level itself. */
const TASK = { brief: S.text(), hint: S.opt(TEXTS), intro: S.opt(INTRO), after: S.opt(TEXTS), ...SENTENCE }
const LEVEL = taskLevel(ONCE, TASK)

/* ---------- game.json ---------- */

const ITEM = S.either(S.level(), S.obj({ parallel: S.list(S.obj({ id: S.str(), title: S.text(), levels: S.list(S.level()) })) }))
const ERA = S.obj({
  id: S.int(),
  machine: S.ref('machine'),
  title: S.text(),
  kicker: S.text(),
  question: S.text(),
  foundation: S.list(ITEM),
})
const GAME = S.obj({
  title: S.text(),
  kicker: S.text(),
  lede: S.text({ about: t('这款游戏教什么、学完能亲手做成什么，不写关卡数', 'what the game teaches and what the player ends up able to do, not how many levels') }),
  trays: TRAYS,
  concept: S.opt(S.map(S.str(), { about: t('几个元件合起来是一个新概念') })),
  eras: S.list(ERA, { min: 1 }),
})

export const vocabulary = defineVocabulary({
  domain: 'syntax',
  version: 2,
  removes: [
    { at: 'kinds.part', why: 'a block is a piece of pieces.json (the strip editor’s), standing for a mark' },
    { at: 'level.tasks.of.folds.of.type', why: 'a fold is folded as a block of pieces.json marking a construction' },
    { at: 'level.tasks.of.roles', why: 'the roles are the blocks of pieces.json marking a role, each to its words' },
    { at: 'level.tasks.of.misrole', why: 'a misreading is said of a block of pieces.json marking a role' },
  ],
  kinds: { mark: MARK_ITEMS, machine: MACHINES },
  game: GAME,
  level: LEVEL,
})
