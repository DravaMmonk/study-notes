import { T } from '../../shell/i18n.js'
import { registerPieces } from '../../engine/pieces.js'
import { parse, show } from './formula.js'
import { say } from './notation.js'
import { methodText, methodsOf, namesOf, regionsOf, scriptJudge, sentencesOf } from './script.js'

const KINDS = ['have', 'show', 'assume', 'fix', 'obtain']
const emptyRow = (k) => ({ k, using: [], ...(k === 'have' || k === 'show' ? { by: '' } : {}) })
const options = (pieces) => Object.entries(registerPieces({}, Object.fromEntries(pieces))).map(([value, text]) => ({ value, text }))

export function script(level, { game, progress }) {
  game.logic.syncOwn(progress.built)
  const consts = [...(level.consts ?? []), ...(level.things ?? [])]
  const read = (f) => parse(f, { consts })
  const text = (f) => say(typeof f === 'string' ? read(f) : f, level.notation)
  const statement = (value) => {
    try { return show(read(value)) } catch { return value }
  }
  const sentences = options(sentencesOf(level).map((f) => [show(f), text(f)]))
  const things = options((level.things ?? []).map((name) => [name, level.notation.words?.[name] ?? name]))
  const { rules, tactics } = methodsOf(level)
  const ruleChoices = options(rules.map(({ key, rule }) => [key, T(`${rule.name.zh} · ${key.slice(5)}`, `${rule.name.en ?? rule.name.zh} · ${key.slice(5)}`)]))
  const tacticChoices = options(tactics.map((name) => [name, methodText(name)]))
  const methods = [{ value: 'proof', text: T('证明块（proof … qed）') }]
  const groups = [
    { label: T('规则', 'Rules'), options: ruleChoices },
    ...(tacticChoices.length ? [{ label: T('自建策略'), options: tacticChoices }] : []),
  ]
  const premises = Object.entries(level.premises ?? {}).map(([name, f]) => ({ name, text: text(f) }))
  const locked = Boolean(level.locked)
  const judge = scriptJudge(level)
  return {
    goal: text(level.goal), premises, judge, locked,
    initial: level.given ?? [],
    add: KINDS.map((k) => ({ label: k, make: () => emptyRow(k) })),
    passed: T('核已检查每一行。证明完毕。'),
    describe: (rows) => {
      const names = namesOf(rows)
      const regions = regionsOf(rows)
      const scopes = new Map()
      const visible = [...premises.map(({ name }) => name)]
      return rows.map((row, i) => {
        const { depth, opens, closes } = regions[i]
        const facts = [...visible, ...[...scopes.values()].flat()]
        if (names[i]) scopes.set(depth, [...(scopes.get(depth) ?? []), names[i]])
        closes.forEach((closed) => scopes.delete(closed + 1))
        const method = row.k === 'have' || row.k === 'show'
        return {
          label: row.k, name: names[i], depth, opens, closes,
          slots: [
            ...(['fix', 'obtain'].includes(row.k) ? [{ key: 'thing', label: T('取的名字'), value: row.thing, options: things, locked }] : []),
            ...(row.k !== 'fix' ? [{ key: 'stmt', label: T('这一句'), value: row.stmt ? statement(row.stmt) : '', options: sentences, blank: T('选择句子'), locked }] : []),
            ...((method || row.k === 'obtain') && row.by !== 'proof'
              ? [{ key: 'using', kind: 'toggle', label: 'using', value: row.using ?? [], options: options(facts.map((name) => [name, name])), locked }]
              : []),
            ...(method ? [{ key: 'by', prefix: 'by', value: row.by, options: methods, groups, locked: locked && row.by === 'proof' }] : []),
          ],
        }
      })
    },
  }
}
