// Defining a function (《证明完毕》 chapter 12, the definition board): one row for each constructor of the argument it
// takes apart (the cases its type's declaration gives), or one for each value of a condition (true, false); the
// player picks each row's right side from a few. The kernel accepts a definition when it computes what it should and
// when every call of the function on a right side takes apart a smaller argument: one built inside the constructor of
// that row's left side. Such a definition is one use of the recursor, so it always stops.
//
// A level: { kind: 'define', fn, on: the index of the argument taken apart (none for a definition by a condition),
// rows: [{ lhs, when?, choices: [rhs] }], tests: [{ term, value }], solution: [rhs], naive?: [rhs], defs?: the
// definitions it uses (by name, course.js) }; terms are written
// as everywhere (u … z, xs, ys, zs variables; schematic.js). The equations (`equations`) are what later levels get by
// the function's name (course.js).
import { cases, hidden, inOrder, property, sameAs } from '../../engine/judge.js'
import { sayTerm } from './notation.js'
import { parseS, parseSide } from './schematic.js'
import { T } from '../../shell/i18n.js'

/** Most rewrites one test may take before it counts as never stopping. */
export const BUDGET = 200

/** The definition as equations, written as a level's definitions are: 'c ⟹ l = r' or 'l = r'. */
export const equations = (level, picks) => level.rows.map((row, k) => `${row.when ? `${row.when} ⟹ ` : ''}${row.lhs} = ${picks[k]}`)

const key = (t) => JSON.stringify(t)
const isVar = (t) => t.t === 'var'
// σ extended so that the pattern (its variables standing for anything) is t; null when it cannot be.
function match(p, t, σ) {
  if (isVar(p)) {
    if (!(p.name in σ)) return { ...σ, [p.name]: t }
    return key(σ[p.name]) === key(t) ? σ : null
  }
  if (isVar(t) || p.f !== t.f || p.args.length !== t.args.length) return null
  let cur = σ
  for (let k = 0; k < p.args.length && cur; k++) cur = match(p.args[k], t.args[k], cur)
  return cur
}
const fill = (t, σ) => (isVar(t) ? σ[t.name] ?? t : { ...t, args: t.args.map((a) => fill(a, σ)) })
// A row as a rule: its left and right sides, and its condition (an equation) if it has one.
const ruleOf = (text) => {
  const [cond, eq] = text.includes('⟹') ? text.split('⟹').map((x) => x.trim()) : [null, text]
  const [lhs, rhs] = parseS(eq).args
  const c = cond ? parseS(cond) : null
  return { lhs, rhs, when: c && { l: c.args[0], r: c.args[1] } }
}

class Loops extends Error {}
/** A term worked out with the equations, innermost first, the first that fits; throws Loops past the budget. */
function normal(t, rules, spent) {
  if (isVar(t)) return t
  const inner = { ...t, args: t.args.map((a) => normal(a, rules, spent)) }
  for (const r of rules) {
    const σ = match(r.lhs, inner, {})
    if (!σ) continue
    if (r.when && key(normal(fill(r.when.l, σ), rules, spent)) !== key(normal(fill(r.when.r, σ), rules, spent))) continue
    if (++spent.n > BUDGET) throw new Loops()
    return normal(fill(r.rhs, σ), rules, spent)
  }
  return inner
}

/** What a term works out to with these equations: { value } or { loops: true }. */
export function evaluate(text, eqs) {
  const rules = eqs.map(ruleOf)
  try {
    return { value: normal(parseSide(text), rules, { n: 0 }) }
  } catch (e) {
    if (e instanceof Loops) return { loops: true }
    throw e
  }
}

// The calls of fn in a term.
const callsIn = (t, fn) => (isVar(t) ? [] : [...(t.f === fn ? [t] : []), ...t.args.flatMap((a) => callsIn(a, fn))])
// The variables strictly inside a pattern (not the pattern itself).
const inside = (p) => (isVar(p) ? [] : p.args.flatMap((a) => (isVar(a) ? [a.name] : [...inside(a)])))
/** The first recursive row whose call does not take apart a smaller argument. */
function nondecreasingRow(level, picks) {
  return level.rows.findIndex((row, k) => {
    const lhs = parseSide(row.lhs)
    const calls = callsIn(parseSide(picks[k]), level.fn)
    if (level.on == null) return calls.length > 0
    const room = inside(lhs.args[level.on])
    return calls.some((c) => !isVar(c.args[level.on]) || !room.includes(c.args[level.on].name))
  })
}

export function checkDefine(level) {
  const complete = property(
    (picks) => picks.every(Boolean) && picks.length === level.rows.length,
    () => ({ why: T('每一行的右边都须写完', 'Every row needs a whole right side') }),
  )
  const say = (term) => sayTerm(term, level.notation)
  const examples = hidden(cases(level.tests, (eqs, test) => {
    const got = evaluate(test.term, eqs)
    const term = say(parseSide(test.term))
    if (got.loops) return {
      why: T(`算 ${term.zh}，${BUDGET} 步还没算完`, `Working out ${term.en}, ${BUDGET} steps did not finish`),
    }
    return sameAs(parseSide(test.value), {
      same: (want, got) => key(want) === key(got),
      why: (want) => {
        const value = say(want)
        return T(`${term.zh} 应当算出 ${value.zh}`, `${term.en} should work out to ${value.en}`)
      },
    })(got.value)
  }))
  const termination = property((row) => row < 0, (row) => ({
    at: { row, slot: 0 },
    why: T(`第 ${row + 1} 行的右边又用到了这个函数，可拆的那个参数没有变小：这样的定义可能永远算不完`, `Row ${row + 1} calls the function again on an argument that is no smaller: such a definition may never finish`),
  }))
  return inOrder(
    complete,
    (picks) => examples([...(level.defs ?? []), ...equations(level, picks)]),
    (picks) => termination(nondecreasingRow(level, picks)),
  )
}
