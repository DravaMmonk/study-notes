// The syntax domain's vocabulary (games/DESIGN.md 6.2): every thing a syntax game's content may name, each with what it
// is and the schema of its parameters, and the schemas of game.json and of one level. Content is these items and
// their parameters, and nothing else: whatever a level needs that is not here is a new item, written in this domain.
//
// The items are implemented next to them: the parts (the skeleton's roles and the constructions a modifier is folded
// as) in model/parts.js, a sentence and its answer in model/sentence.js.

import { S } from '../../engine/schema.js'
import { SAVES, defineVocabulary } from '../../engine/vocabulary.js'
import { PARTS, ROLES, TYPES } from './model/parts.js'
import { T as t } from '../../shell/i18n.js'

const item = (about, params) => ({ about, ...(params ? { params } : {}) })
const ids = S.list(S.str())
const TEXTS = S.list(S.text())

/* ---------- the parts, the machine ---------- */

/** A part is what a level brings in (`adds`): a role of the skeleton ('role:subj') or a construction ('pp'). */
const partText = (key) => (key.startsWith('role:') ? ROLES[key.slice(5)] : TYPES[key])
const PART_ITEMS = Object.fromEntries(PARTS.map((key) => {
  const { name, desc } = partText(key)
  return [key, item(t(`${name.zh}：${desc.zh}`, `${name.en}: ${desc.en}`))]
}))
const MACHINES = {
  reader: item(t('读者：标出主干，把修饰成分折到它修饰的词上', 'the reader: marks the skeleton, folds each modifier onto the word it modifies')),
}

/* ---------- a level ---------- */

/** A phrase as it stands in the sentence; one that occurs more than once is told apart with #n ('change#2'). */
const PHRASE = S.str({ about: t('句子里的一段词，出现不止一次时写 #n（change#2）', 'words as they stand in the sentence, #n for the n-th of several (change#2)') })
const FOLD = S.obj({
  span: PHRASE,
  type: S.oneOf(Object.keys(TYPES), { about: t('折成的结构', 'the construction it is folded as') }),
  to: PHRASE,
  misread: S.opt(S.map(S.text(), { about: t('挂在别的词（键）上时，那样挂是什么意思', 'what hanging it on another word (the key) would mean') })),
})
const ROLE_SPANS = Object.fromEntries(Object.keys(ROLES).map((role) => [role, ['subj', 'verb'].includes(role) ? PHRASE : S.opt(PHRASE)]))
const MISROLE = S.obj(Object.fromEntries(Object.keys(ROLES).map((role) => [role, S.opt(S.map(S.text(), {
  about: t('标成这个成分、还立着的那几个词（小写）标错时说什么；* 是这句话根本没有这个成分', 'what to say when these standing words (lower case) are marked as it; * when the sentence has no such role'),
}))])))
/** One sentence and its answer, in words (model/sentence.js resolve reads them into indices). */
const SENTENCE = {
  sentence: S.str(),
  folds: S.opt(S.list(FOLD)),
  roles: S.obj(ROLE_SPANS),
  misrole: S.opt(MISROLE),
  given: S.opt(S.list(PHRASE, { about: t('已经折好、拆不开的块（答案里的折）', 'folds already made and fixed in place (folds of the answer)') })),
}
const INTRO = S.list(S.obj({ t: S.text() }))
const COMMON = {
  title: S.text(),
  brief: S.text(),
  intro: S.opt(INTRO),
  hint: S.opt(TEXTS),
  adds: S.opt(S.list(S.ref('part'), { section: 'course', about: t('这一关带来的成分或结构', 'the roles and constructions the level brings in') })),
  showcase: S.opt(S.text({ section: 'course', about: t('新东西第一次出现时只用它一个也算一关：它的用法抽象在哪里', 'a new part may have a level that only uses it: what is abstract about its use') })),
  debrief: S.obj({ title: S.text(), body: TEXTS, note: S.opt(S.text()) }),
}
const TASK = S.obj({ step: S.text(), brief: S.text(), hint: S.opt(TEXTS), intro: S.opt(INTRO), after: S.opt(TEXTS), ...SENTENCE })
const LEVEL = S.either(
  S.obj({ ...COMMON, ...SENTENCE }),
  S.obj({ ...COMMON, tasks: S.list(TASK, { min: 2, section: 'tasks', about: t('几句话依次做，最后一句就是这一关', 'several sentences done in turn, the last one the level itself') }) }),
)

/* ---------- game.json ---------- */

const ITEM = S.either(S.level(), S.obj({ parallel: S.list(S.obj({ id: S.str(), title: S.text(), levels: S.list(S.level()) })) }))
const ERA = S.obj({
  id: S.int(),
  machine: S.ref('machine'),
  keeps: S.opt(S.either(S.oneOf(['all']), ids)),
  title: S.text(),
  kicker: S.text(),
  question: S.text(),
  foundation: S.list(ITEM),
})
const GAME = S.obj({
  title: S.text(),
  kicker: S.text(),
  lede: S.text({ about: t('这款游戏教什么、学完能亲手做成什么，不写关卡数', 'what the game teaches and what the player ends up able to do, not how many levels') }),
  concept: S.opt(S.map(S.str(), { about: t('几个元件合起来是一个新概念', 'parts that are one new idea together') })),
  eras: S.list(ERA, { min: 1 }),
  saves: SAVES,
})

export const vocabulary = defineVocabulary({
  domain: 'syntax',
  version: 2,
  kinds: { part: PART_ITEMS, machine: MACHINES },
  game: GAME,
  level: LEVEL,
})
