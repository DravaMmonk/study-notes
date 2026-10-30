// Sentence analysis, the syntax domain's one puzzle: a long sentence from a computer science paper is taken apart the
// way a careful reader takes it apart. Every modifier is folded into one piece and hung on the word it modifies; what
// is left standing is the skeleton, whose subject, verb and object (or complement) the player marks.
//
// A sentence is a row of tokens (words and punctuation). An analysis is plain data, indices into that row:
//
//   { folds: [{ a, b, type, to }], roles: { subj?: [a, b], verb?: [a, b], obj?: [a, b], comp?: [a, b] } }
//
// A fold covers the tokens a..b (inclusive), is a construction of `type` (types.js), and hangs on the word at `to`,
// outside it. Folds nest (a fold may hold folds made before it) and never cross, and a fold goes with the word it hangs
// on: when that word is folded into a bigger piece, the fold is inside that piece too (a phrase's modifiers belong to
// the phrase). A role is a stretch of the sentence;
// only its words left standing (not under a fold) count.
//
// A level writes its sentence and its answer in words, not indices (`resolve` turns them into this):
//
//   { sentence, folds: [{ span, type, to, misread?: { word: { zh, en } } }], roles: { subj, verb, obj?, comp? },
//     misrole?: { role: { 'words as marked' | '*': { zh, en } } }, given?: [span] }
//
// A span or a word that occurs more than once in the sentence is told apart with #n ('change#2'). `misread` says what
// the sentence would mean with a fold hung on another word; `misrole` what is wrong with a stretch marked as a role
// (keyed by its standing words, lower case; '*' when the sentence has no such role at all); `given` lists folds already
// made and fixed in place.

import { ROLES, TYPES } from './types.js'

const pair = (zh, en) => ({ zh, en })
const WORD = /[A-Za-z0-9]/

/** The tokens of a sentence: [{ text, word }], punctuation apart from the words. */
export function tokenize(text) {
  return (text.match(/[A-Za-z0-9][A-Za-z0-9'’-]*|[^\sA-Za-z0-9]/g) ?? []).map((t) => ({ text: t, word: WORD.test(t) }))
}

/** Tokens a..b as written: words spaced, punctuation against the word before it. */
export function say(tokens, a, b) {
  let out = ''
  for (let i = a; i <= b; i++) out += (i > a && tokens[i].word ? ' ' : '') + tokens[i].text
  return out
}

// Where a phrase (written as in the sentence, with #n for its n-th occurrence) stands: [a, b], or a problem.
function locate(tokens, phrase) {
  const [text, nth] = String(phrase).split('#')
  const want = tokenize(text).map((t) => t.text.toLowerCase())
  const hits = []
  for (let i = 0; i + want.length <= tokens.length; i++) if (want.every((w, k) => tokens[i + k].text.toLowerCase() === w)) hits.push([i, i + want.length - 1])
  if (!want.length || !hits.length) return { problem: `“${phrase}” is not in the sentence` }
  if (nth) return hits[Number(nth) - 1] ? { at: hits[Number(nth) - 1] } : { problem: `“${phrase}”: there is no occurrence ${nth}` }
  if (hits.length > 1) return { problem: `“${phrase}” occurs ${hits.length} times: say which with #n` }
  return { at: hits[0] }
}

/**
 * A level's sentence and answer, from words to indices: { tokens, folds, given, roles, misread, misrole, problems }.
 * `misread` is a Map from a fold's key (`a-b`) to a Map from a word's index to its text.
 */
export function resolve(spec) {
  const tokens = tokenize(spec.sentence)
  const problems = []
  const at = (phrase) => {
    const r = locate(tokens, phrase)
    if (r.problem) problems.push(r.problem)
    return r.at ?? null
  }
  const word = (w) => {
    const r = at(w)
    if (r && r[0] !== r[1]) problems.push(`“${w}” is not one word`)
    return r ? r[0] : null
  }
  const misread = new Map()
  const folds = []
  for (const f of spec.folds ?? []) {
    const span = at(f.span)
    const to = word(f.to)
    if (!TYPES[f.type]) problems.push(`“${f.span}”: unknown type ${f.type}`)
    if (!span || to === null) continue
    const fold = { a: span[0], b: span[1], type: f.type, to }
    folds.push(fold)
    misread.set(keyOf(fold), new Map(Object.entries(f.misread ?? {}).map(([w, text]) => [word(w), text])))
  }
  const roles = {}
  for (const [role, phrase] of Object.entries(spec.roles ?? {})) {
    if (!ROLES[role]) problems.push(`unknown role ${role}`)
    const span = at(phrase)
    if (span) roles[role] = span
  }
  const given = (spec.given ?? []).map((g) => {
    const span = at(g)
    return span && folds.find((f) => f.a === span[0] && f.b === span[1])
  }).filter(Boolean)
  return { tokens, folds, given, roles, misread, misrole: spec.misrole ?? {}, problems }
}

export const keyOf = (f) => `${f.a}-${f.b}`
const holds = (f, g) => f.a <= g.a && g.b <= f.b
const crosses = (f, g) => (f.a < g.a && g.a <= f.b && f.b < g.b) || (g.a < f.a && f.a <= g.b && g.b < f.b)
/** Whether token i is under one of the folds. */
export const hidden = (folds, i) => folds.some((f) => f.a <= i && i <= f.b)
/** The folds standing at the top: under no other. */
export const top = (folds) => folds.filter((f) => !folds.some((g) => g !== f && holds(g, f)))

/**
 * The sentence as it stands: [{ kind: 'word' | 'punct' | 'fold', a, b, fold? }], a fold standing for every token it
 * covers.
 */
export function units(tokens, folds) {
  const out = []
  const outer = top(folds)
  for (let i = 0; i < tokens.length; i++) {
    const f = outer.find((g) => g.a === i)
    if (f) {
      out.push({ kind: 'fold', a: f.a, b: f.b, fold: f })
      i = f.b
    } else out.push({ kind: tokens[i].word ? 'word' : 'punct', a: i, b: i })
  }
  return out
}

/** The words of a..b left standing under `folds`, as indices. */
export const standing = (tokens, folds, [a, b]) => {
  const out = []
  for (let i = a; i <= b; i++) if (tokens[i].word && !hidden(folds, i)) out.push(i)
  return out
}

/** Why a..b cannot be folded as it stands, or null. */
export function foldRefusal(analysis, a, b) {
  if (analysis.folds.some((f) => f.a === a && f.b === b)) return pair('这一块已经折起来了。', 'This is folded already.')
  if (analysis.folds.some((f) => crosses(f, { a, b }))) return pair('这样会把一块折好的成分切开。', 'That would cut through a folded piece.')
  const left = top(analysis.folds).find((f) => (f.b < a || f.a > b) && a <= f.to && f.to <= b)
  if (left) return pair('这一块里有个词还挂着外面的一块修饰成分：修饰成分跟着它修饰的词走，要一起折进来。', 'A word in here still has a folded modifier hanging on it from outside: a modifier goes with its word, so take it in too.')
  return null
}

/** Why a..b cannot hang on the word at `to`, or null. */
export function targetRefusal(tokens, analysis, a, b, to) {
  if (!tokens[to]?.word) return pair('要点一个词。', 'Tap a word.')
  if (a <= to && to <= b) return pair('它修饰的词在这一块外面。', 'The word it modifies is outside it.')
  if (hidden(analysis.folds, to)) return pair('这个词已经折在别的成分里了。', 'That word is folded inside another piece.')
  return null
}

/** Fold a..b as `type`, hung on `to`. */
export const fold = (analysis, a, b, type, to) => ({ ...analysis, folds: [...analysis.folds, { a, b, type, to }] })
/** Undo one fold; the folds inside it stay. */
export const unfold = (analysis, f) => ({ ...analysis, folds: analysis.folds.filter((g) => !(g.a === f.a && g.b === f.b)) })
/** Mark a..b as `role`, or take the mark off when it is there already. */
export function mark(analysis, role, a, b) {
  const roles = { ...analysis.roles }
  const was = roles[role]
  if (was && was[0] === a && was[1] === b) delete roles[role]
  else roles[role] = [a, b]
  return { ...analysis, roles }
}

const quote = (tokens, a, b) => `“${say(tokens, a, b)}”`
const lower = (tokens, list) => list.map((i) => tokens[i].text.toLowerCase()).join(' ')

/**
 * An analysis against the answer: { pass, findings: [{ zh, en, at? }] }. `at` is the stretch a finding is about, for the
 * sentence to mark. Missing folds are counted, not shown: the player looks for them.
 */
export function check(gold, analysis) {
  const { tokens } = gold
  const findings = []
  const find = (text, at) => findings.push({ ...text, at })
  const golden = new Map(gold.folds.map((f) => [keyOf(f), f]))
  const mine = new Set(analysis.folds.map(keyOf))
  for (const p of analysis.folds) {
    const g = golden.get(keyOf(p))
    const q = quote(tokens, p.a, p.b)
    if (g) {
      if (p.type !== g.type) find(pair(`${q}不是${TYPES[p.type].name.zh}。`, `${q} is not a ${TYPES[p.type].name.en}.`), [p.a, p.b])
      else if (p.to !== g.to) {
        const w = `“${tokens[p.to].text}”`
        find(gold.misread.get(keyOf(g))?.get(p.to) ?? pair(`这样挂，${q}说明的就是${w}。读一读，意思通吗？`, `Hung there, ${q} tells about ${w}. Read it: does that make sense?`), [p.a, p.b])
      }
    } else if (gold.folds.some((f) => f.a === p.a || f.b === p.b)) find(pair(`${q}的边界不对：多了或少了几个词。`, `${q} has the wrong edges: a few words too many or too few.`), [p.a, p.b])
    else find(pair(`${q}不是一个整块的修饰成分。`, `${q} is not one whole modifier.`), [p.a, p.b])
  }
  const missing = gold.folds.filter((f) => !mine.has(keyOf(f))).length
  if (missing) find(pair(`还有 ${missing} 个修饰成分没有折起来。`, `${missing} modifier${missing === 1 ? ' is' : 's are'} still not folded.`))

  // Nothing marked at all: one finding for the skeleton, not one a role (which would tell which roles there are).
  if (!Object.keys(analysis.roles).length) {
    find(pair('还没有标出主干。', 'The skeleton is not marked yet.'))
    return { pass: false, findings }
  }
  for (const role of Object.keys(ROLES)) {
    const want = gold.roles[role]
    const got = analysis.roles[role]
    const name = ROLES[role].name
    if (!want && !got) continue
    if (!got) {
      find(pair(`还没有标出${name.zh}。`, `The ${name.en} is not marked yet.`))
      continue
    }
    const words = standing(tokens, analysis.folds, got)
    const own = gold.misrole[role] ?? {}
    if (!want) {
      find(own['*'] ?? pair(`这句话里没有${name.zh}。`, `This sentence has no ${name.en}.`), got)
      continue
    }
    const meant = standing(tokens, gold.folds, want)
    const head = meant[meant.length - 1]
    const ok = role === 'verb'
      ? words.length === meant.length && words.every((i) => meant.includes(i))
      : words.includes(head) && words.every((i) => meant.includes(i))
    if (ok) continue
    const q = `“${words.map((i) => tokens[i].text).join(' ')}”`
    // Words the answer folds away, left standing inside the marked stretch: a modifier not yet folded.
    const mixed = words.some((i) => hidden(gold.folds, i))
    find(own[lower(tokens, words)] ?? (mixed
      ? pair(`${name.zh}里还混着修饰成分。`, `The ${name.en} still has a modifier mixed in.`)
      : pair(`${q}不是${name.zh}。`, `${q} is not the ${name.en}.`)), got)
  }
  return { pass: findings.length === 0, findings }
}

/** The skeleton the answer leaves: the standing words of its roles, in order ("The running time grows."). */
export function skeleton(gold) {
  const words = Object.values(gold.roles).flatMap((span) => standing(gold.tokens, gold.folds, span)).sort((x, y) => x - y)
  const text = words.map((i) => gold.tokens[i].text).join(' ')
  return `${text.charAt(0).toUpperCase()}${text.slice(1)}.`
}

/**
 * An order the answer's folds can be made in, or null when there is none: a fold comes after the folds inside it, and
 * before any fold that would hide the word it hangs on.
 */
export function order(folds) {
  // g must come before f: g lies inside f, or f would hide g's word.
  const before = (g, f) => g !== f && ((holds(f, g) && keyOf(f) !== keyOf(g)) || (f.a <= g.to && g.to <= f.b))
  const left = [...folds]
  const done = []
  while (left.length) {
    const k = left.findIndex((f) => !left.some((g) => before(g, f)))
    if (k < 0) return null
    done.push(left.splice(k, 1)[0])
  }
  return done
}
