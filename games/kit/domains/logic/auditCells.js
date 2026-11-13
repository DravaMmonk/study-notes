import { T } from '../../shell/i18n.js'
import { WORDS } from '../../shell/words.js'
import { show } from './formula.js'
import { propositionsOf, sentenceOf } from './iso.js'
import { say } from './notation.js'
import { sentencePicker } from './sentenceLanguage.js'

export const DERIVABLE = [
  { value: true, label: T('可推导', 'Derivable') },
  { value: false, label: T('不可推导', 'Not derivable') },
]
const fixed = (name) => (row) => row.fixed?.includes(name)

export function caseCells(level) {
  const read = (value) => sentenceOf(level, value)
  const build = sentencePicker(propositionsOf(level).map(read), { read, notation: level.notation, consts: level.things ?? [], text: (value) => say(read(value), level.notation) })
  const target = show(read(level.target))
  return [
    {
      name: 'given', shape: 'tree-list', label: T('前提'), align: 'start', build,
      placeholder: T('无'), addLabel: T('添加前提'), scope: `${level.id}:case`,
      title: (k) => T(`第 ${k + 1} 条条例的前提`, `A premise of test case ${k + 1}`),
      fixed: fixed('given'), fixedLabel: T('前提（固定）'), kept: (row) => row.keep,
      write: (row, given) => ({ ...row, given: [...(row.keep ?? []), ...given.filter((s) => !row.keep?.includes(s))] }),
    },
    {
      name: 'goal', shape: 'tree', label: T('目标', 'Goal'), build,
      placeholder: T('选择目标…'), scope: `${level.id}:goal`,
      title: (k) => T(`第 ${k + 1} 条条例的目标`, `The goal of test case ${k + 1}`),
      fixed: (row) => Boolean(level.caseGoal) || fixed('goal')(row), fixedLabel: T('目标（固定）'),
      read: (row) => level.caseGoal ?? row.goal ?? level.target,
      write: (row, goal) => ({ ...row, goal: goal === target ? undefined : goal }),
    },
    {
      name: 'make', shape: 'choice', label: WORDS.wanted, options: DERIVABLE, placeholder: T('选择预期…'),
      fixed: (row) => level.caseMake !== undefined || fixed('make')(row), fixedLabel: T('应得（固定）'),
      read: (row) => level.caseMake ?? row.make,
    },
  ]
}
