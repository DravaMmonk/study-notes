import { useMemo, useState } from 'react'
import { Brief, PhonePage, RunDock, Workbench } from '../../../shell/index.js'
import { L, tr } from '../../../shell/i18n.js'
import { Chips, Strip, StripTools, useStrip } from '../../../strip/index.js'
import { useHistory } from '../../../circuit/useHistory.js'
import { SLOT_KIND, nextSlot, place, slotName, slotsOf } from '../engine/grammar.js'
import { familyOf, featuresOf } from '../engine/parts.js'
import { check, openSlots, surface, toClause } from '../engine/sentence.js'
import Meaning from './Meaning.jsx'
import Sentence from './Sentence.jsx'

// A syntax level, the same in every syntax game and on every screen: the situation and meaning graph to say, the clause
// written out as it reads with a box for each empty place (subject, then the predicate: time, verb and the places the
// verb opens), the words to fill it with, and the run bar.
//
// A clause is planned time first, the way it is meant, and said in reading order: until the time is set, the other
// places are locked; once it is, an empty verb box names the form the time holds for it. The forms, agreement and case are the machine's; the player makes only the decisions. Running checks
// the sentence against the meaning graph; a pass solves the level with its word count as the score.

const CHIP_GROUPS = [['time', { zh: '时间', en: 'Time' }], ['np', { zh: '名词短语', en: 'Noun phrases' }], ['verb', { zh: '动词', en: 'Verbs' }]]
const TIME_FIRST = { zh: '先定时间，再放词。', en: 'Set the time before placing words.' }

export default function SyntaxScreen({ game, level, saved, save, solve, progress, phone }) {
  const { lex } = game.syntax
  const spec = level.source
  const preset = useMemo(() => toClause(spec.preset), [spec])
  const [clause, setClause] = useState(() => ({ ...(saved?.clause ?? {}), ...preset }))
  const [run, setRun] = useState(null) // the last run's result, until the clause changes
  const live = useMemo(() => check(lex, spec, clause), [lex, spec, clause])

  const change = (next) => {
    setClause(next)
    save({ clause: next })
    setRun(null)
  }
  const history = useHistory(clause, change, level.id, 0)
  const slots = slotsOf(lex, clause)
  const timed = Boolean(clause.TIME)

  const strip = useStrip({
    put: (slot, chip) => {
      if (slot !== 'TIME' && !timed) return TIME_FIRST
      const r = place(lex, clause, slot, chip)
      if (r.why) return r.why
      change(r.clause)
      return null
    },
    // Taking the verb out takes the places it opened with it.
    take: (slot) => change(Object.fromEntries(Object.entries({ ...clause, [slot]: undefined }).filter(([s, v]) => v && (slot !== 'V' || !['OBJ', 'IOBJ', 'TO'].includes(s))))),
    target: (chip) => slots.find((s) => !clause[s] && SLOT_KIND[s] === lex.part(chip).kind) ?? null,
    filled: (slot) => Boolean(clause[slot]),
    fixed: (slot) => Boolean(preset[slot]),
  })

  // The clause as it reads: each slot's words, or a box for an empty one; a bare suffix (-ed) is a small mark.
  const line = []
  slots.forEach((key, k) => {
    if (k) line.push(' ')
    if (key === 'TO') line.push('to ')
    const said = surface(lex, clause, key)
    if (!said) return line.push({ hole: key, label: slotName(lex, clause, key) })
    const text = k === 0 ? `${said.text.charAt(0).toUpperCase()}${said.text.slice(1)}` : said.text
    line.push({ piece: key, family: familyOf(lex, clause[key]), fixed: Boolean(preset[key]), dim: said.dim, parts: [text] })
  })
  line.push('.')
  const used = new Set(Object.values(clause))
  const chips = CHIP_GROUPS
    .map(([kind, label]) => ({ key: kind, label, locked: kind !== 'time' && !timed, chips: level.palette.filter((t) => lex.part(t).kind === kind).map((t) => ({ key: t, text: kind === 'time' ? lex.part(t).shape : L(lex.part(t).text), sub: featuresOf(lex, t), family: familyOf(lex, t), used: used.has(t) })) }))
    .filter((g) => g.chips.length)

  const go = () => {
    strip.clearSelection()
    const result = check(lex, spec, clause)
    setRun(result)
    if (result.pass) solve({ words: result.words, star: result.star })
  }
  const verdict = run && (run.pass
    ? (run.star ? tr('意思全对。', 'Every part of the meaning matches.') : tr(`意思全对，但用了 ${run.words} 个词；★ 要不超过 ${spec.target} 个。`, `Every part of the meaning matches, but it takes ${run.words} words; the ★ needs at most ${spec.target}.`))
    : !run.complete ? tr(`句子还没填完：${L(openSlots(run.open))}还空着。`, `The sentence is not finished: ${L(openSlots(run.open))} still empty.`)
      : tr('句子说的和语义图不一样，看标红的地方。', 'The sentence says something other than the meaning graph: look at what is marked red.'))
  const sense = lex.types().map(lex.part).find((p) => p.kind === 'verb' && p.lemma === spec.meaning.pred).sense
  const note = strip.note
    ? <p className={`ks-note ${strip.note.bad ? 'is-bad' : ''}`} role="status">{L(strip.note.text)}</p>
    : <p className="ks-note">{tr('点击文字可以删除。', 'Tap words to delete them.')}</p>

  const meaning = <Meaning context={spec.context} meaning={spec.meaning} sense={sense} run={run} />
  const brief = <Brief game={game} level={level} hint={spec.hint} />
  const stage = (
    <div className="sx-stage">
      {phone && meaning}
      <StripTools history={history} onClear={() => change({ ...preset })} empty={!Object.keys(clause).some((s) => clause[s] && !preset[s])} />
      <Strip line={line} label={{ zh: '小句', en: 'clause' }} next={strip.selected ?? nextSlot(lex, clause)} selected={strip.selected} flash={strip.flash} onSlot={strip.onSlot} />
      {note}
      <Sentence run={live} target={spec.target} best={progress.best[level.id]} />
      <Chips groups={chips} onChip={strip.onChip} />
      {verdict && <p className={`sx-verdict ${run.pass ? 'is-pass' : 'is-fail'}`} role="status">{verdict}</p>}
      <footer className="run-foot">
        <RunDock
          go={{ label: run?.pass ? tr('意思对上了', 'Meaning matches') : tr('对照语义图', 'Check the meaning'), pass: Boolean(run?.pass), onClick: go }}
        />
      </footer>
    </div>
  )
  if (phone) return <PhonePage brief={brief} className="sx-level">{stage}</PhonePage>
  return <Workbench className="sx-level" brief={<>{brief}<div className="sx-goal">{meaning}</div></>} stage={stage} scroll />
}
