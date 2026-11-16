import { cases, property } from '../../engine/judge.js'
import { T } from '../../shell/i18n.js'
import { atom, parse } from './formula.js'
import { say } from './notation.js'
import { lettersOf, rowsOf, tautology, valueOn } from './truth.js'

export function truth(level) {
  const formulas = level.formulas.map((t) => parse(t))
  const tables = formulas.map((formula) => {
    const letters = lettersOf([formula])
    return {
      title: say(formula, level.notation),
      headers: letters.map((letter) => say(atom(letter), level.notation)),
      rows: rowsOf(letters).map((row) => ({ given: letters.map((letter) => row[letter]), value: valueOn(formula, row) })),
    }
  })
  const wants = {
    fill: tables[0].rows.map(({ value }) => value),
    valid: formulas.map(tautology),
  }
  const check = cases(wants[level.ask] ?? [], (values, want, k) => values[k] === want ? null : { at: { row: k }, want, got: values[k] })
  const judge = (state) => {
    const expected = wants[level.ask]
    if (!expected) {
      const hit = property((work) => Object.keys(work.tried).some((key) => {
        const [f, k] = key.split(':').map(Number)
        return tables[f].rows[k].value === (level.ask === 'sat')
      }), () => ({}))
      return { pass: !hit(state), wrong: new Set() }
    }
    const values = level.ask === 'fill' ? state.fill : state.marks
    const wrong = new Set(expected.flatMap((want, k) => values[k] === want ? [] : [k]))
    return { pass: !check(values), wrong }
  }
  return {
    tables, judge,
    mode: level.ask === 'fill' ? 'fill' : level.ask === 'valid' ? 'classify' : 'try',
    hit: (f, k) => level.ask !== 'fill' && level.ask !== 'valid' && tables[f].rows[k].value === (level.ask === 'sat'),
    accepted: level.ask === 'counter' ? T('已找到反例：命题在这一行为假。') : level.ask === 'sat' ? T('已找到满足赋值：命题在这一行为真。') : T('全部正确。'),
    wrong: (count) => T(`还有 ${count} 处错误，已用红色标出。`, `${count} still wrong, marked in red.`),
    labels: {
      values: [T('假', 'F'), T('真', 'T')],
      classify: [T('不恒成立'), T('恒成立')],
      inspect: T('展开真值表'),
    },
  }
}
