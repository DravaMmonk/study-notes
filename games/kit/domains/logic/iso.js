// A declaration is an ordered list of introduction rules, each with the things it takes and the sentences it needs.
// The rules generate the elimination rule: one case for every way to introduce the declared sentence.
//
// A test gives some premises and asks whether its goal follows. An introduction rule may make the goal from these
// premises. Otherwise Apply, Take one, Example and the declaration's elimination rule decide what follows.
// A specification is tested on cases, not proved. Audit tasks (audit-cases.js) test given declarations instead.
import { sameJson } from '../../engine/json-value.js'
import { atom, fn, meta, parse, show, subst as substF, tvar } from './formula.js'
import { say } from './notation.js'
import { constructorsOf, datatypeRules } from './datatype.js'
import { ruleOf, ruleText } from './schematic.js'
import { L, T, tr } from '../../shell/i18n.js'
import { cases, hidden, inOrder, sameAs } from '../../engine/judge.js'

/** A sentence of the level, its things read as names (not variables). */
export const sentenceOf = (level, text) => parse(text, { consts: level.things ?? [] })
const keyOf = (f) => show(f)
const thing = (name) => ({ t: 'fn', f: name, args: [] })

// A sentence with the things in σ put in for their names.
function subst(x, σ) {
  if (Array.isArray(x)) return x.map((y) => subst(y, σ))
  if (!x || typeof x !== 'object') return x
  if (x.t === 'var' && σ[x.name]) return σ[x.name]
  return Object.fromEntries(Object.entries(x).map(([k, v]) => [k, subst(v, σ)]))
}
// σ extended so that `pattern`, with `vars` free, is `inst`; null when it cannot be.
function match(pattern, inst, vars, σ) {
  if (pattern && pattern.t === 'var' && vars.has(pattern.name)) {
    if (σ[pattern.name]) return sameJson(σ[pattern.name], inst) ? σ : null
    return { ...σ, [pattern.name]: inst }
  }
  if (Array.isArray(pattern)) {
    if (!Array.isArray(inst) || inst.length !== pattern.length) return null
    return pattern.reduce((s, p, k) => s && match(p, inst[k], vars, s), σ)
  }
  if (!pattern || typeof pattern !== 'object') return pattern === inst ? σ : null
  if (!inst || typeof inst !== 'object') return null
  const keys = new Set([...Object.keys(pattern), ...Object.keys(inst)])
  return [...keys].reduce((s, k) => s && match(pattern[k], inst[k], vars, s), σ)
}

// Satisfy a rule by instantiating its variables and looking up the premises it takes.
function satisfy(rule, ctx) {
  const vars = new Set(rule.binds)
  const start = ctx.goal ? match(ctx.target, ctx.goal, vars, {}) : {}
  if (!start) return null
  const unassigned = rule.binds.filter((v) => !start[v])
  const assignments = unassigned.reduce((all, v) => all.flatMap((σ) => ctx.things.map((t) => ({ ...σ, [v]: thing(t) }))), [start])
  for (const σ of assignments) {
    const premises = rule.needs.map((need) => ctx.have.get(keyOf(subst(ctx.read(need), σ))))
    if (premises.every(Boolean)) {
      return [...rule.binds.map((name) => ({ kind: 'thing', name: σ[name].f })), ...premises]
    }
  }
  return null
}

// Prefer the first rule that uses the most evidence.
function introduce(level, rules, test, goal) {
  const read = (s) => sentenceOf(level, s)
  const have = new Map(test.given.map((sentence, k) => [keyOf(read(sentence)), { kind: 'ev', sentence, n: k + 1 }]))
  const ctx = { have, read, things: level.things ?? [], target: read(level.target), goal }
  let best = null
  rules.forEach((rule, k) => {
    const items = satisfy(rule, ctx)
    if (items && (!best || items.length > best.items.length)) best = { kind: 'proof', way: k + 1, items }
  })
  return best
}

/**
 * Whether a test's goal follows from its premises by Apply, Take one (on the things known) and Example (for a goal
 * "there is"), and by the declared sentence's elimination rule (one case per way, a thing a way takes named afresh)
 * once the declared sentence is reached.
 */
export function follows(level, rules, test) {
  const read = (s) => sentenceOf(level, s)
  const things = (level.things ?? []).map(thing)
  // Everything those rules reach from the facts, with these things to take.
  const reach = (facts, own) => {
    const known = new Map(facts.map((f) => [keyOf(f), f]))
    const add = (f) => !known.has(keyOf(f)) && known.set(keyOf(f), f)
    let grew = true
    while (grew) {
      const size = known.size
      for (const f of [...known.values()]) {
        if (f.op === '→' && known.has(keyOf(f.a))) add(f.b)
        if (f.op === '∀') for (const t of [...things, ...own]) add(substF(f.body, f.v, t))
      }
      grew = known.size > size
    }
    return known
  }
  const goal = read(test.goal)
  const reached = (known, own) => known.has(keyOf(goal)) || (goal.op === '∃' && [...things, ...own].some((t) => known.has(keyOf(substF(goal.body, goal.v, t)))))
  // The premises first, as far as Apply and Take one reach (A and A → ⊥ give ⊥); the elimination rule then applies
  // when the declared sentence is among what they reach, not only among the premises written.
  const known = reach(test.given.map(read), [])
  if (reached(known, [])) return true
  if (!known.has(keyOf(read(level.target)))) return false
  const start = [...known.values()]
  return rules.every((w, k) => {
    const own = w.binds.map((b) => thing(`${b}${k + 1}′`))
    const σ = Object.fromEntries(w.binds.map((b, j) => [b, own[j]]))
    return reached(reach([...start, ...w.needs.map((n) => subst(read(n), σ))], own), own)
  })
}

/**
 * A type a declaration on the rule board declares (chapter 12, `datatype: { type, ctors, args }`): the k-th way is the constructor
 * ctors[k], its bound things elements and each assumption the type args[sentence] names: 'zero | s(nat)'.
 */
export function typeOf(level) {
  const { ctors, args } = level.datatype
  return level.solution.map((way, k) => {
    const of = [...way.binds.map(() => 'elem'), ...way.needs.map((s) => args[s])]
    return of.length ? `${ctors[k]}(${of.join(', ')})` : ctors[k]
  }).join(' | ')
}

/**
 * Whether a test's goal is derivable under these rules: { derived, made? }. An intro rule must make it (made: the way and
 * what it took) when the declared sentence is not given and the goal is of its shape, unless the premises reach it by
 * Apply already; otherwise the elimination rule and Apply decide (follows).
 */
export function derives(level, rules, test) {
  const read = (s) => sentenceOf(level, s)
  const target = read(level.target)
  const goal = test.goal ? read(test.goal) : target
  const given = test.given.map((s) => keyOf(read(s)))
  const shape = (f) => [f.op, f.pred, f.v !== undefined].join('|')
  // A goal the premises reach without an intro rule (A and A → ⊥ give ⊥) needs none.
  if (!test.uses && !given.includes(keyOf(target)) && shape(goal) === shape(target) && follows(level, rules, { given: test.given, goal: test.goal ?? level.target })) return { derived: true }
  if (test.uses || (!given.includes(keyOf(target)) && shape(goal) === shape(target))) {
    const made = introduce(level, rules, test, keyOf(goal) !== keyOf(target) ? goal : null)
    return { derived: Boolean(made), made }
  }
  if (given.includes(keyOf(goal))) return { derived: true }
  return { derived: follows(level, rules, { given: test.given, goal: test.goal ?? level.target }) }
}

/** A test's premises, as a phrase: 前提为「下雨」、「刮风」 (or 没有前提). */
export const givenText = (test, words) => {
  const has = test.given.map(words)
  return has.length
    ? T(`前提为${has.map((h) => `「${h.zh}」`).join('、')}`, `with the premises ${has.map((h) => `“${h.en}”`).join(', ')}`)
    : T('没有前提')
}

/** The first declaration check that fails, with its premises and goal described by the domain. */
export function checkIso(level, words) {
  const name = level.declare
  const examples = hidden(cases(level.tests, (rules, test) => {
    const got = derives(level, rules, test)
    const given = givenText(test, words)
    const goal = test.goal ? words(test.goal) : name
    const derived = sameAs(test.make, {
      why: () => ({ relation: 'derives', subject: goal, given }),
    })(got.derived)
    if (derived) return derived
    // A way that takes what is given, where the test asks for one.
    const taken = new Set((got.made?.items ?? []).filter((x) => x.kind === 'ev').map((x) => x.sentence))
    const unused = (test.uses ?? []).filter((s) => !taken.has(s)).map(words)
    return unused.length ? {
      want: test.uses,
      got: [...taken],
      why: T(`推导出了「${goal.zh}」，但用到的引入规则没有用上前提${unused.map((u) => `「${u.zh}」`).join('、')}。`, `“${goal.en}” is derived, but by an intro rule that does not take the premise ${unused.map((u) => `“${u.en}”`).join(', ')}.`),
    } : null
  }))
  if (!level.ways) return examples
  // A way as written in `ways`: what it takes in order, a thing as '⋀x'.
  const key = (ways) => ways.map((w) => w.map((s) => (s.startsWith('⋀') ? '⋀' : s)).join('|')).sort().join('/')
  const said = (s) => (s.startsWith('⋀') ? T('任取一样东西') : words(s))
  const ways = sameAs(level.ways, {
    got: (rules) => rules.map((w) => [...w.binds.map((b) => `⋀${b}`), ...w.needs]),
    same: (want, got) => key(want) === key(got),
    why: (want) => T(`每条条例都正确，但引入规则与要求不符：${want.map((w) => `⟦${w.map((s) => said(s).zh).join('; ')}⟧ ⟹ 「${name.zh}」`).join('；')}`, `Every test case is right, but the intro rules are not the ones asked for: ${want.map((w) => `⟦${w.map((s) => said(s).en).join('; ')}⟧ ⟹ “${name.en}”`).join('; ')}`),
  })
  return inOrder(examples, ways)
}

/** Every sentence a test case of the level may give or aim at: its available sentences, its declared one, and its tests'. */
export function propositionsOf(level) {
  const all = [...level.sentences, level.target, ...level.tests.flatMap((t) => [...t.given, ...(t.goal ? [t.goal] : [])])]
  return [...new Set(all)]
}

const premise = (show, hyps = [], fixes = []) => ({ fixes, hyps, show })
/**
 * A way as a rule: its assumptions in turn are the premises, the declared sentence the conclusion, and a way that
 * takes things is a rule for any of them (`fixes`): ⋀x. ⟦x is human⟧ ⟹ ∃y. y is human.
 */
const wayRule = (way, level, g) => ({ fixes: way.binds, premises: way.needs.map((n) => premise(g(sentenceOf(level, n)))), conclusion: g(sentenceOf(level, level.target)) })

/** A rule written out, with the things a way takes in front: ⋀x. ⟦x is human⟧ ⟹ ∃y. y is human. */
export const wayText = (rule, say) => `${rule.fixes?.length ? `⋀${rule.fixes.join(' ')}. ` : ''}${ruleText(rule, say)}`

// The declared sentence's own letters and predicates, each a metavariable in turn (?A, ?B … for a sentence, ?P, ?Q …
// for one about things): the rules for any sentences, not just the level's. A new proposition (one whose sentence
// shares nothing with what it assumes) keeps its sentences.
function general(level) {
  const atoms = (f, out = []) => {
    if (f.op === 'atom') {
      if (f.pred !== '=' && !out.includes(f.pred)) out.push(f.pred)
      return out
    }
    for (const x of [f.a, f.b, f.body]) if (x) atoms(x, out)
    return out
  }
  const target = sentenceOf(level, level.target)
  const assumed = new Set(level.sentences.flatMap((s) => atoms(sentenceOf(level, s))))
  const props = []
  const preds = []
  const names = new Map()
  const arity = (f, p) => {
    if (f.op === 'atom') return f.pred === p ? f.args.length : null
    for (const x of [f.a, f.b, f.body]) if (x) { const n = arity(x, p); if (n !== null) return n }
    return null
  }
  for (const p of atoms(target).filter((l) => assumed.has(l))) {
    if (arity(target, p)) names.set(p, `?${'PQSTU'[preds.push(p) - 1]}`)
    else names.set(p, `?${'ABCDE'[props.push(p) - 1]}`)
  }
  const g = (f) => {
    if (f.op === 'atom') return names.has(f.pred) ? (f.args.length ? { op: 'meta', name: names.get(f.pred), args: f.args } : meta(names.get(f.pred))) : f
    return { ...f, ...(f.a && { a: g(f.a) }), ...(f.b && { b: g(f.b) }), ...(f.body && { body: g(f.body) }) }
  }
  return g
}

/**
 * What a declaration gives, for any sentences: one rule for each way to make it, and the rule that takes it apart,
 * made from them (having it, and for each way a conclusion ?R from what that way took, for any thing it took, gives
 * ?R), or the level's own (`take`: equality). `g` writes the sentences: by default as any sentences (?A …); the identity
 * keeps the level's own.
 */
export function declaredRules(level, ways, g = general(level)) {
  const R = meta('?R')
  return {
    make: ways.map((way) => wayRule(way, level, g)),
    take: level.take
      ? ruleOf('take', null, level.take.premises, level.take.conclusion)
      : { premises: [premise(g(sentenceOf(level, level.target))), ...ways.map((way) => premise(R, way.needs.map((n) => g(sentenceOf(level, n))), way.binds))], conclusion: R },
  }
}

/**
 * What passing a declaration gives, said when it is passed (the passed dialog's lines): its rules for any sentences,
 * those that make it (one for each way), and the one that takes it apart, made from them (declaredRules); for a type
 * (chapter 12), its constructors and the rules the kernel makes of them.
 */
export function declaredLines(level) {
  const text = (f) => L(say(f, level.notation))
  if (level.datatype) {
    const type = typeOf(level)
    const thing = (c) => text(atom('=', [fn(c.f, c.args.map(tvar)), fn(c.f, c.args.map(tvar))])).split(' = ')[0]
    return {
      label: T('声明给出的规则'),
      lines: [`${level.datatype.type} = ${constructorsOf(type).map(thing).join(' | ')}`, ...datatypeRules(level.datatype.type, type).map((r) => `${L(r.name)}：${ruleText(r, text)}`)],
    }
  }
  const rules = declaredRules(level, level.solution)
  return { label: T('声明给出的规则'), lines: [...rules.make.map((r, k) => `${tr(`引入规则 ${k + 1}：`, `Intro rule ${k + 1}: `)}${wayText(r, text)}`), `${tr('消去规则：')}${wayText(rules.take, text)}`] }
}
