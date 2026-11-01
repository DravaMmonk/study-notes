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
  [/\b(?:cards?|blocks?)\b/i, 'everything on a board is a part'],
  [/\b(?:simply|just wire|obviously)\b/i, 'no hand-waving words'],
]
const AHEAD = [/下一关|后面的关|后面你会|之后会用到|以后会用到|稍后/, /\bnext level\b|\blater levels?\b|\byou will (?:later|soon)\b|\bcoming up\b/i]
const WHY = [/因为|为了|所以/, /\bbecause\b|\bso that\b/i]

// Upper bounds, in characters of the Chinese side (the English side may run to 3×): a brief states the task, an intro
// paragraph says one thing, a hint points, a pass text is a sentence.
const LIMITS = { brief: 90, intro: 170, hint: 110, after: 70 }

const plain = (s) => String(s ?? '').replace(REF, (_, kind, id) => `[${id}]`).replace(/<[^>]+>/g, '')
const sides = (v) => (typeof v === 'string' ? { zh: v, en: v } : v ?? {})

/** The copy findings over a game's levels, game.json texts and glossary. */
export function lintCopy(content) {
  const out = []
  const say = (rule, at, says) => out.push({ rule, at, says })
  const texts = (level) => [
    ['brief', level.brief],
    ...(level.intro ?? []).map((p, k) => [`intro[${k}]`, p.t]),
    ...(level.hint ?? []).map((h, k) => [`hint[${k}]`, h]),
    ['after', level.after],
    ['title', level.title],
  ].filter(([, v]) => v)
  const words = (at, text) => {
    const { zh, en } = sides(text)
    for (const [re, why] of BANNED) {
      const m = plain(zh).match(re) ?? plain(en).match(re)
      if (m) say('copy-banned', at, `「${m[0]}」: ${why}`)
    }
    const ahead = plain(zh).match(AHEAD[0]) ?? plain(en).match(AHEAD[1])
    if (ahead) say('copy-ahead', at, `「${ahead[0]}」`)
  }
  for (const level of content.levels) {
    for (const [field, text] of texts(level)) {
      const at = `${level.id}.${field}`
      words(at, text)
      const { zh = '', en = '' } = sides(text)
      const kind = field.replace(/\[\d+\]$/, '')
      const limit = LIMITS[kind]
      if (limit && (plain(zh).length > limit || plain(en).length > limit * 3)) say('copy-length', at, `${plain(zh).length} characters (zh), ${plain(en).length} (en); at most ${limit} and ${limit * 3}`)
    }
    const first = level.intro?.[0]?.t
    if (first && (/^\s*新元件/.test(plain(sides(first).zh)) || /^\s*A new part/i.test(plain(sides(first).en)))) say('copy-intro-part', `${level.id}.intro[0]`, 'the intro opens on the new part')
    if (level.after && /<part-ref /.test(`${sides(level.after).zh} ${sides(level.after).en}`)) say('copy-after-part', `${level.id}.after`, 'the pass text links a part')
    if (level.brief) {
      const { zh = '', en = '' } = sides(level.brief)
      if (WHY[0].test(plain(zh)) || WHY[1].test(plain(en))) say('copy-brief-why', `${level.id}.brief`, 'the brief gives a reason; reasons go in the intro')
    }
  }
  for (const [k, entry] of (content.glossary?.entries ?? []).entries()) for (const [j, p] of (entry.body ?? []).entries()) words(`glossary.${entry.id ?? k}.body[${j}]`, p)
  for (const field of ['lede', 'kicker']) if (content[field]) words(`game.${field}`, content[field])
  return out
}
