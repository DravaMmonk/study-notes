// The syntax domain's vocabulary (games/DESIGN.md 6.2): every thing a syntax game's content may name, each with what it
// is and the schema of its parameters, and the schemas of game.json and of one level. Content is these items and
// their parameters, and nothing else: whatever a level needs that is not here is a new item, written in this domain.
//
// The items are implemented next to them: the parts (the skeleton's roles and the constructions a modifier is folded
// as) in model/parts.js, a sentence and its answer in model/sentence.js.

import { S } from '../../engine/schema.js'
import { defineVocabulary } from '../../engine/vocabulary.js'
import { taskLevel } from '../../engine/tasks.js'
import { TRAY, TRAYS } from '../../engine/trays.js'
import { PARTS, ROLES, TYPES } from './model/parts.js'
import { T as t } from '../../shell/i18n.js'

const item = (about, params) => ({ about, ...(params ? { params } : {}) })
const TEXTS = S.list(S.text())

/* ---------- the parts, the machine ---------- */

/** A part is what a level brings in (`adds`): a role of the skeleton ('role:subj') or a construction ('pp'). */
const partText = (key) => (key.startsWith('role:') ? ROLES[key.slice(5)] : TYPES[key])
const PART_ITEMS = Object.fromEntries(PARTS.map((key) => {
  const { name, desc } = partText(key)
  return [key, item(t(`${name.zh}：${desc.zh}`, `${name.en}: ${desc.en}`))]
}))
const MACHINES = {
  reader: item(t('读者：标出主干，把修饰成分折到它修饰的词上')),
}

/* ---------- a level ---------- */

/** A phrase as it stands in the sentence; one that occurs more than once is told apart with #n ('change#2'). */
const PHRASE = S.str({ about: t('句子里的一段词，出现不止一次时写 #n（change#2）') })
const FOLD = S.obj({
  span: PHRASE,
  type: S.oneOf(Object.keys(TYPES), { about: t('折成的结构') }),
  to: PHRASE,
  misread: S.opt(S.map(S.text(), { about: t('挂在别的词（键）上时，那样挂是什么意思') })),
})
const ROLE_SPANS = Object.fromEntries(Object.keys(ROLES).map((role) => [role, ['subj', 'verb'].includes(role) ? PHRASE : S.opt(PHRASE)]))
const MISROLE = S.obj(Object.fromEntries(Object.keys(ROLES).map((role) => [role, S.opt(S.map(S.text(), {
  about: t('标成这个成分、还立着的那几个词（小写）标错时说什么；* 是这句话根本没有这个成分'),
}))])))
/** One sentence and its answer, in words (model/sentence.js resolve reads them into indices). */
const SENTENCE = {
  sentence: S.str(),
  folds: S.opt(S.list(FOLD)),
  roles: S.obj(ROLE_SPANS),
  misrole: S.opt(MISROLE),
  given: S.opt(S.list(PHRASE, { about: t('已经折好、拆不开的块（答案里的折）') })),
}
const INTRO = S.list(S.obj({ t: S.text() }))
/** What a level says once: its title, its place in the course, its introduction, its pass text. */
const ONCE = {
  title: S.text(),
  adds: S.opt(S.list(S.ref('part'), { section: 'course', about: t('这一关带来的成分或结构') })),
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
  version: 1,
  kinds: { part: PART_ITEMS, machine: MACHINES },
  game: GAME,
  level: LEVEL,
})
