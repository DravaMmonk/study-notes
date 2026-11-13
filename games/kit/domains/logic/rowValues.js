import { T } from '../../shell/i18n.js'
import { showTerm } from './formula.js'
import { parseS, parseSide } from './schematic.js'
import { say, sayTerm } from './notation.js'
import { complete, straysOf, termChips } from './formulaTree.js'
import { checkDefine } from './define.js'
import { declaredRules, sentenceOf, wayRule, wayText, waysIn } from './iso.js'
import { blankRule, boardOf, checkDeclaration, linesOf, premiseChips, problemsOf } from './ruleLines.js'
import { sentenceLanguage } from './sentenceLanguage.js'

const blank = T('未写完')
const changeAt = (items, at, fn) => items.map((item, k) => k === at ? fn(item) : item)
const without = (items, at) => items.filter((_, k) => k !== at)
const whole = (tree) => Boolean(tree) && complete(tree) && !straysOf(tree).length

export function declarationValues(level, rules, change, scope) {
  const binder = level.binder ?? 'x'
  const words = (value) => say(value, level.notation)
  const chips = premiseChips(level)
  const problems = problemsOf(level, rules)
  const withRule = (k, fn) => change(changeAt(rules, k, fn))
  return {
    className: 'lg-rule-table',
    head: { name: T('结论'), goal: words(sentenceOf(level, level.target)), end: T('为真。') },
    rows: rules.map((rule, k) => ({
      name: T('成立条件'), mark: k + 1,
      toggle: level.thing && { on: rule.binds.length > 0, label: T(`任取 ${binder}`, `For any ${binder}`), run: () => withRule(k, (r) => ({ ...r, binds: r.binds.length ? [] : [binder] })) },
      slots: rule.needs.map((need, j) => ({ text: whole(need) ? words(need) : null, bad: problems.some((p) => p.rule === k && p.need === j) })),
      end: rule.needs.length > 1 ? T('均为真。') : T('为真。'),
      empty: T('无前提'),
      add: { label: T(`给成立条件 ${k + 1} 添加前提`, `Add a premise to condition ${k + 1}`), text: rule.needs.length ? null : T('添加前提'), run: () => withRule(k, (r) => ({ ...r, needs: [...r.needs, null] })) },
      drop: rules.length > 1 ? { label: T(`删除成立条件 ${k + 1}`, `Delete condition ${k + 1}`), run: () => change(without(rules, k)) } : null,
    })),
    editor: change && {
      slot: (k, j) => ({
        title: T(`成立条件 ${k + 1} 的前提`, `A premise of condition ${k + 1}`),
        tree: rules[k].needs[j], chips, language: sentenceLanguage(level.notation, 'formula', rules[k].binds), scope: `${scope}:${k}.${j}`,
        onChange: (tree) => withRule(k, (r) => ({ ...r, needs: changeAt(r.needs, j, () => tree) })),
      }),
      close: (k, j) => {
        if (rules[k]?.needs[j] === null) withRule(k, (r) => ({ ...r, needs: without(r.needs, j) }))
      },
    },
    more: { text: T('添加成立条件'), run: () => change([...rules, blankRule()]) },
    blank,
  }
}

/** The introduction rules as entered, and the generated elimination rule. */
export function ruleLines(level, ways, read) {
  if (!ways.length) return []
  const text = (f) => read(say(f, level.notation))
  return [
    ...ways.map((way, k) => ({ name: read(T('引入')), mark: k + 1, text: wayText(wayRule(way, level), text) })),
    { name: read(T('消去')), text: wayText(declaredRules(level, ways, (f) => f).take, text) },
  ]
}

export function declaration(level) {
  const judge = checkDeclaration(level)
  return {
    initial: (saved) => saved?.rules ?? [blankRule()],
    keep: (rules) => ({ rules }),
    judge,
    rows: (rules, change, scope) => declarationValues(level, rules, change, scope),
    lines: (rules, read) => problemsOf(level, rules).length ? [] : ruleLines(level, waysIn(boardOf(linesOf(rules))), read),
    passed: T('这份声明符合需求。'),
    score: (rules) => ({ steps: rules.length }),
  }
}

export function definition(level) {
  const term = (text) => sayTerm(parseSide(text), level.notation)
  const condition = (text) => say(parseS(text), level.notation)
  const chips = level.rows.map((row) => termChips(row.choices.map(parseSide), level.notation))
  const language = sentenceLanguage(level.notation, 'term')
  const judge = checkDefine(level)
  return {
    initial: (saved) => Array.isArray(saved) && saved.length === level.rows.length ? saved : level.rows.map(() => null),
    keep: (sides) => sides,
    judge: (sides) => judge(sides.map((side) => complete(side) ? showTerm(side) : '')),
    rows: (sides, change, scope) => ({
      wide: true,
      rows: level.rows.map((row, k) => ({
        name: term(row.lhs), equation: true, when: row.when ? condition(row.when) : null,
        slots: [{ text: complete(sides[k]) ? term(showTerm(sides[k])) : null }],
      })),
      editor: {
        slot: (k) => ({
          title: term(level.rows[k].lhs), equation: true,
          tree: sides[k], onChange: (tree) => change(changeAt(sides, k, () => tree)), chips: chips[k], language, scope: `${scope}:${k}`,
        }),
      },
      blank,
    }),
    passed: T('每个值都正确，每次递归调用的参数都更小，因此这条定义必定终止。'),
    score: () => null,
  }
}
