// The copy lint (games/DIRECTION.md decision 1, games/DESIGN.md 4 and 7.2): what the handbook's copy rules forbid that
// a machine can see, over a game's content. npm run check already checks both sides, links and positional references
// to levels (../engine/text.js); this adds the words the rules ban, lengths, an intro that opens on a new part, a pass
// text that names parts or looks ahead. Each finding names one rule.
//
// lintCopy(content) → [{ rule, at, says }]
import { REF } from '../engine/text.js'

/** The rules, by id. */
export const LINT_RULES = {
  'copy-banned': 'a word the copy rules ban (colloquial, translationese, or calling a part a card or a block)',
  'copy-ahead': 'a text that tells what a later level does',
  'copy-length': 'longer than the copy rules allow',
  'copy-intro-part': 'an intro that opens on a new part before saying what the machine lacks',
  'copy-after-part': 'a pass text that names a part (it is retelling the answer)',
  'copy-brief-why': 'a brief that explains or motivates (that goes in the intro)',
}

// Each banned pattern with what to write instead. The Chinese ones are the handbook's own list (DESIGN 4).
const BANNED = [
  [/搞定|接一下|啥|就行|没事/, 'colloquial: write standard written Chinese'],
  [/进行|得到证明|得到揭示|被引入|对[^，。]{1,8}进行/, 'translationese: use an active verb'],
  [/卡片|方块/, 'everything on a board is a 元件'],
  // A network card is the field's own term, not a board's piece.
  [/(?<!network )\bcards?\b|\bblocks?\b/i, 'everything on a board is a part'],
  [/\b(?:simply|just wire|obviously)\b/i, 'no hand-waving words'],
]
const AHEAD = [/下一关|后面的关|后面你会|之后会用到|以后会用到|稍后/, /\bnext level\b|\blater levels?\b|\byou will (?:later|soon)\b|\bcoming up\b/i]
const WHY = [/因为|为了|所以/, /\bbecause\b|\bso that\b/i]

// Upper bounds, in characters of the Chinese side (the English side may run to 3×): a brief states the task, an intro
// paragraph says one thing, a hint points, a pass text is a sentence.
const LIMITS = { brief: 90, intro: 170, hint: 110, after: 70 }

const plain = (s) => String(s ?? '').replace(REF, (_, kind, id) => `[${id}]`).replace(/<[^>]+>/g, '')
const sides = (v) => (typeof v === 'string' ? { zh: v, en: v } : v ?? {})

/**
 * The findings on one text, by the field it is (brief, intro, hint, after, title; any other field is held to the word
 * rules only): [{ rule, says }]. lintCopy runs it over a game; the studio beside a text as it is written.
 */
export function lintText(field, text) {
  const out = []
  const say = (rule, says) => out.push({ rule, says })
  const { zh = '', en = '' } = sides(text)
  // One finding a text for each rule: the first banned word it has.
  const banned = BANNED.map(([re, why]) => [plain(zh).match(re) ?? plain(en).match(re), why]).find(([m]) => m)
  if (banned) say('copy-banned', `「${banned[0][0]}」: ${banned[1]}`)
  const ahead = plain(zh).match(AHEAD[0]) ?? plain(en).match(AHEAD[1])
  if (ahead) say('copy-ahead', `「${ahead[0]}」`)
  const limit = LIMITS[field]
  if (limit && (plain(zh).length > limit || plain(en).length > limit * 3)) say('copy-length', `${plain(zh).length} characters (zh), ${plain(en).length} (en); at most ${limit} and ${limit * 3}`)
  if (field === 'after' && /<part-ref /.test(`${zh} ${en}`)) say('copy-after-part', 'the pass text links a part')
  if (field === 'brief' && (WHY[0].test(plain(zh)) || WHY[1].test(plain(en)))) say('copy-brief-why', 'the brief gives a reason; reasons go in the intro')
  return out
}

/** The copy findings over a game's levels, game.json texts and glossary. */
export function lintCopy(content) {
  const out = []
  const add = (at, field, text) => out.push(...lintText(field, text).map((f) => ({ ...f, at })))
  const texts = (level) => [
    ['brief', level.brief],
    ...(level.intro ?? []).map((p, k) => [`intro[${k}]`, p.t]),
    ...(level.hint ?? []).map((h, k) => [`hint[${k}]`, h]),
    ['after', level.after],
    ['title', level.title],
  ].filter(([, v]) => v)
  for (const level of content.levels) {
    // A level's own texts, then each of its tasks' (../engine/tasks.js).
    const own = [[level, level.id], ...level.tasks.map((task, k) => [task, `${level.id}.tasks[${k}]`])]
    for (const [o, at] of own) for (const [field, text] of texts(o)) add(`${at}.${field}`, field.replace(/\[\d+\]$/, ''), text)
    const first = level.intro?.[0]?.t ?? level.tasks[0].intro?.[0]?.t
    if (first && (/^\s*新元件/.test(plain(sides(first).zh)) || /^\s*A new part/i.test(plain(sides(first).en)))) out.push({ rule: 'copy-intro-part', at: `${level.id}.intro[0]`, says: 'the intro opens on the new part' })
  }
  for (const [k, entry] of (content.glossary?.entries ?? []).entries()) for (const [j, p] of (entry.body ?? []).entries()) add(`glossary.${entry.id ?? k}.body[${j}]`, 'body', p)
  for (const field of ['lede', 'kicker']) if (content[field]) add(`game.${field}`, field, content[field])
  return out
}
