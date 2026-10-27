// Structured proof scripts (《证明完毕》 chapter 14), Isar's have … show: a script is rows, each a sentence and how it
// is proved, and each row is one card of the proof board. A row proves its sentence from the facts it names (`using`,
// the wires into the card) by a method (`by`): a kernel rule or a lemma (rule, then each premise closed by a fact), or a
// tactic the player built (auto, simp with the level's simp set, metis, induction): all of them only use rules. Or it
// is proved by a block of rows (`proof`): an assumption box opened by `assume`, For any by `fix`; inside, `obtain`
// takes out what an ∃ fact says there is (Take the one there is), and the block ends with its `show`.
//
//   row     { k: 'have' | 'show' | 'assume' | 'fix' | 'obtain', stmt?: formula text, using?: [name], by?: method | 'proof',
//             thing?: name (fix, obtain) }
//   method  'rule:<key>' (a rule of the level's rule book) | 'auto' | 'simp' | 'metis' | 'induct'
//
// Facts are named by place: the n-th have h<n>, the n-th assume a<n>, the n-th obtain o<n>; premises by their own
// names. A block runs from the row proved by it to the show that ends it (rendered proof … qed).
import { fn, parse, same, show, subst } from './formula.js'
import { KERNEL, assumption, depthFirst, rule } from './tactics.js'
import { ruleBookOf, runTactic } from './machine.js'

const T = (zh, en) => ({ zh, en })

/** The names of a script's facts, by row: h1 … for have, a1 … for assume, o1 … for obtain (a show ends its block). */
export function namesOf(rows) {
  const n = { have: 0, assume: 0, obtain: 0 }
  return rows.map((r) => (r.k === 'have' ? `h${++n.have}` : r.k === 'assume' ? `a${++n.assume}` : r.k === 'obtain' ? `o${++n.obtain}` : null))
}
/** Each row's depth: rows after one proved by `proof` go one deeper, until the show that ends that block. */
export function depthsOf(rows) {
  let d = 0
  return rows.map((r) => {
    const here = d
    if ((r.k === 'have' || r.k === 'show') && r.by === 'proof') d++
    else if (r.k === 'show' && d > 0) d--
    return here
  })
}


/** What a row may state: the goal, the premises, the level's own sentences and every part of each, once each; and ⊥. */
export function sentencesOf(level) {
  const consts = [...(level.consts ?? []), ...(level.things ?? [])]
  const parts = (f, out) => {
    out.push(f)
    if (f.op === '¬') parts(f.a, out)
    else if (f.op === '∀' || f.op === '∃') parts(f.body, out)
    else if (f.a) { parts(f.a, out); parts(f.b, out) }
    return out
  }
  const all = [level.goal, ...Object.values(level.premises ?? {}), ...(level.sentences ?? []), '⊥'].flatMap((t) => parts(parse(t, { consts }), []))
  return [...new Map(all.map((f) => [show(f), f])).values()]
}

/**
 * The methods a level offers for `by`, in groups: the rules it holds (kernel rules and lemmas, by key), and the tactics
 * it has built (auto, simp, metis; induction when it declares a type).
 */
export function methodsOf(level) {
  const book = ruleBookOf(level)
  const has = (p) => !level.holds || level.holds.includes(p)
  return {
    rules: Object.values(book).filter((r) => !r.datatype).map((r) => ({ key: `rule:${r.key}`, rule: r })),
    tactics: ['auto', 'simp', 'metis'].filter(has).concat(level.datatypes && has('simp') ? ['induct'] : []),
  }
}

// A proof state for one row: its sentence, from the facts it names; fixed things are names already.
const stateOf = (goal, hyps) => ({ kind: 'state', goals: [{ fixes: [], hyps, goal }], scopes: {}, inst: {}, fixed: [], query: [] })
// Every goal of each state closed by a fact.
const closed = (states) => depthFirst(states, (x) => assumption(x).results ?? [], { limit: 400, most: 1 }).found.length > 0

/** Does the method prove the sentence from the facts? '' or why not. */
export function proves(level, method, goal, hyps) {
  const s = stateOf(goal, hyps)
  const book = ruleBookOf(level)
  const done = (out) => (out && !out.error && !out.goals.length)
  if (method.startsWith('rule:')) {
    const r = book[method.slice(5)]
    if (!r) return T('这一关没有这条规则', 'This level has no such rule')
    const out = rule(s, r)
    if (out.fail) return out.fail
    return closed(out.results) ? '' : T('规则用上了，可它的前提不全在 using 的事实里', 'The rule applies, but its premises are not all among the facts used')
  }
  if (method === 'auto' || method === 'metis') {
    const out = runTactic(level, method, s)
    return done(out) ? '' : out.error ?? T(`${method} 没有证完`, `${method} did not finish`)
  }
  const simpWith = (x, extra = []) => {
    const out = runTactic(level, 'simp', x, [...(level.simp ?? []), ...extra])
    if (out.error) return [out]
    return [out, ...(rule(out, KERNEL.refl).results ?? []), ...(assumption(out).results ?? [])]
  }
  if (method === 'simp') return simpWith(s).some((x) => done(x) || closed([x])) ? '' : T('化简完了，两边还不一样', 'Simplified, and the two sides still differ')
  if (method === 'induct') {
    const [type] = Object.keys(level.datatypes ?? {})
    const out = rule(s, book[`${type}.induct`])
    if (out.fail) return out.fail
    // Each case: simp with the level's simp set and what the case assumes, then both sides alike.
    const each = (x) => {
      if (!x.goals.length) return true
      const one = { ...x, goals: [x.goals[0]] }
      return simpWith(one, ['hyp']).some((y) => (done(y) || closed([y])) && each({ ...x, inst: y.inst, goals: x.goals.slice(1) }))
    }
    return out.results.some(each) ? '' : T('归纳的某一种情况没有证完', 'A case of the induction is not finished')
  }
  return T('还没选 by', 'Nothing chosen after by')
}

/**
 * A script checked against the sentence to prove, from the level's premises: { pass, rows: [reason or ''], reason }.
 * Each row's own reason says what is wrong with it; the script as a whole must end in a show of the goal.
 */
export function checkScript(level, rows) {
  const consts = level.consts ?? []
  const names = namesOf(rows)
  const reasons = rows.map(() => '')
  const things = new Set()
  const read = (text) => parse(text, { consts: [...consts, ...things] })
  const env = new Map(Object.entries(level.premises ?? {}).map(([n, f]) => [n, parse(f, { consts })]))
  let k = 0
  const fail = (i, zh, en) => { reasons[i] = T(zh, en); return null }
  // A block: rows from k on, proving `target`; its result is the block's own conclusion. Returns true when proved.
  const block = (target, scope) => {
    let want = target
    while (k < rows.length) {
      const i = k++
      const r = rows[i]
      const facts = (r.using ?? []).map((n) => scope.get(n))
      if ((r.using ?? []).some((n) => !scope.has(n))) return fail(i, 'using 里有一个名字还不在这里', 'A name used is not available here')
      let stmt = null
      if (r.k !== 'fix') {
        if (!r.stmt) return fail(i, '还没选这一句', 'No sentence chosen yet')
        try { stmt = read(r.stmt) } catch { return fail(i, '这一句读不出来', 'This sentence cannot be read') }
      }
      if (r.k === 'assume') {
        const imp = want.op === '¬' ? { a: want.a, b: { op: '⊥' } } : want.op === '→' ? want : null
        if (!imp || !same(imp.a, stmt)) return fail(i, 'assume 只能假设要证的「若…则…」的前一半', 'assume can only assume the “if” part of what is to be proved')
        scope = new Map([...scope, [names[i], stmt]])
        want = imp.b
        continue
      }
      if (r.k === 'fix') {
        if (want.op !== '∀') return fail(i, 'fix 只能用在要证「对所有」的时候', 'fix only works when “for all” is to be proved')
        if (!r.thing || [...scope.values(), want].some((f) => JSON.stringify(f).includes(`"f":"${r.thing}"`))) return fail(i, '取一个这里还没用过的名字', 'Pick a name not used here yet')
        things.add(r.thing)
        want = subst(want.body, want.v, fn(r.thing))
        continue
      }
      if (r.k === 'obtain') {
        const e = facts[0]
        if (!e || e.op !== '∃') return fail(i, 'obtain 要 using 一句「存在」', 'obtain must use a “there is”')
        if (!r.thing || [...scope.values(), want].some((f) => JSON.stringify(f).includes(`"f":"${r.thing}"`))) return fail(i, '取一个这里还没用过的名字', 'Pick a name not used here yet')
        things.add(r.thing)
        if (!same(subst(e.body, e.v, fn(r.thing)), read(r.stmt))) return fail(i, `这一句不是那句「存在」说的 ${r.thing}`, `This is not what the “there is” says of ${r.thing}`)
        scope = new Map([...scope, [names[i], read(r.stmt)]])
        continue
      }
      // have / show: by a block or by a method.
      if (r.k === 'show' && !same(stmt, want)) return fail(i, `这里要 show 的是「${show(want)}」`, `What is to be shown here is “${show(want)}”`)
      if (r.by === 'proof') {
        if (!block(stmt, scope)) return null
      } else {
        const why = proves(level, r.by ?? '', stmt, facts)
        if (why) return fail(i, why.zh, why.en)
      }
      // A show ends the block. (A thing fix or obtain took is new, so what the block concludes cannot mention it.)
      if (r.k === 'show') return true
      scope = new Map([...scope, [names[i], stmt]])
    }
    return false
  }
  const goal = parse(level.goal, { consts })
  const ok = block(goal, env)
  const rest = k < rows.length
  const pass = Boolean(ok) && !rest && reasons.every((x) => !x)
  const reason = pass ? '' : reasons.find(Boolean) ?? (rest ? T('show 了要证的那句以后，不能再写', 'Nothing may follow the show of what is to be proved') : T('还没有 show 要证的那一句', 'What is to be proved is not shown yet'))
  return { pass, rows: reasons, reason }
}

/** A row's method as Isar writes it. */
export const methodText = (by) => (!by ? '…' : by === 'proof' ? '' : by.startsWith('rule:') ? `(rule ${by.slice(5)})` : by === 'induct' ? '(induction) simp' : by)
