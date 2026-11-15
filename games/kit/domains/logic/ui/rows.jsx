import { useMemo } from 'react'
import { L, T, tr } from '../../../shell/i18n.js'
import RuleRows from '../../../shell/RuleRows.jsx'
import NamedLines from '../../../shell/NamedLines.jsx'
import { showTerm } from '../formula.js'
import { parseS, parseSide } from '../schematic.js'
import { say, sayTerm } from '../notation.js'
import { complete, termChips } from '../formulaTree.js'
import { declaredRules, wayRule, wayText, waysIn } from '../iso.js'
import { blankRule, boardOf, linesOf, problemsOf } from '../ruleLines.js'
import RuleTable from './RuleTable.jsx'
import SentenceEditor from './SentenceEditor.jsx'

export function ruleLines(level, ways) {
  if (!ways.length) return []
  const text = (f) => L(say(f, level.notation))
  return [
    ...ways.map((way, k) => ({ name: tr('引入'), mark: k + 1, text: wayText(wayRule(way, level), text) })),
    { name: tr('消去'), text: wayText(declaredRules(level, ways, (f) => f).take, text) },
  ]
}

function DeclarationEditor({ task, work, onChange, scope }) {
  return <RuleTable level={task} rules={work.rules} onChange={(rules) => onChange({ rules })} scope={scope} />
}

function DeclarationPreview({ task, work }) {
  const rules = work.rules
  const lines = problemsOf(task, rules).length ? [] : ruleLines(task, waysIn(boardOf(linesOf(rules))))
  return <NamedLines lines={lines} />
}

const UNFINISHED = T('未写完')

const kept = (level, saved) => level.rows.map((_, k) => {
  const one = Array.isArray(saved) && saved.length === level.rows.length ? saved[k] : null
  if (typeof one !== 'string') return one ?? null
  try {
    return one ? parseSide(one) : null
  } catch {
    return null
  }
})

function DefinitionEditor({ task: level, work: sides, prepared: picks, onChange, scope }) {
  const term = (text) => L(sayTerm(parseSide(text), level.notation))
  const cond = (text) => L(say(parseS(text), level.notation))
  const chips = useMemo(() => level.rows.map((row) => termChips(row.choices.map(parseSide), level.notation)), [level])
  return (
    <RuleRows
      wide
      rows={level.rows.map((row, k) => ({
        name: <>{row.when && <>{cond(row.when)} ⟹ </>}<b>{term(row.lhs)}</b> =</>,
        slots: [{ text: picks[k] ? term(picks[k]) : null }],
      }))}
      editor={{
        title: (k) => `${term(level.rows[k].lhs)} =`,
        render: (k) => (
          <div className="lg-sentence-box">
            <SentenceEditor key={k} root="term" tree={sides[k]} onChange={(tree) => onChange(sides.map((side, j) => (j === k ? tree : side)))} chips={chips[k]} notation={level.notation} scope={`${scope}:${k}`} />
          </div>
        ),
      }}
      blank={UNFINISHED}
    />
  )
}

export const rows = {
  declaration: {
    Editor: DeclarationEditor,
    Preview: DeclarationPreview,
    open: (_, saved) => ({ rules: saved?.rules ?? [blankRule()] }),
    inputs: (_, work) => work.rules,
    score: (work) => ({ steps: work.rules.length }),
  },
  definition: {
    Editor: DefinitionEditor,
    open: kept,
    inputs: (_, sides) => sides.map((side) => (complete(side) ? showTerm(side) : '')),
  },
}
