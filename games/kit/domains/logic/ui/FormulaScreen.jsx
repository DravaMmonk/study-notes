import { useMemo, useRef, useState } from 'react'
import { Brief, Level, RunDock, useKeptVerdict } from '../../../shell/index.js'
import { L, tr } from '../../../shell/i18n.js'
import { WORDS } from '../../../shell/words.js'
import { freeVars, parse } from '../formula.js'
import { difference, extent, structureOf } from '../fol.js'
import { chipsOf, complete, straysOf } from '../formulaTree.js'
import { WorldText, thingName } from './WorldScreens.jsx'
import TreeEditor from '../../../strip/TreeEditor.jsx'
import { sentenceLanguage, STRAY } from '../sentenceLanguage.js'
import { Markup } from '../../../shell/Markup.jsx'

// Translate and query tasks (《证明完毕》 chapter 5): one sentence said in words, built as a formula from chips
// (TreeEditor.jsx). A translation passes when it means the same as the sentence in every small world, and shows a world where it does
// not otherwise; a query (x left free) passes when it picks out the right things in each of the level's worlds.
//
//   level  { kind: 'translate' | 'query', say: { zh, en }, target: formula text, decoys?: [formula text] }

export default function FormulaScreen({ game, level: entry, saved, save, solve, lastRun, keepRun, phone }) {
  const level = entry.source
  const { notation } = level
  const consts = level.vocab.names
  const target = useMemo(() => parse(level.target, { consts }), [level, consts])
  const chips = useMemo(() => chipsOf(level), [level])
  const [tree, setTree] = useState(() => saved?.tree ?? null)
  const change = (next) => {
    setTree(next)
    save({ tree: next })
    setVerdict(null)
  }
  const strays = straysOf(tree)
  const whole = complete(tree) && !strays.length

  // A whole sentence, held against the one asked for.
  const compare = () => {
    const want = level.kind === 'query' ? ['x'] : []
    const loose = [...freeVars(tree)].filter((v) => !want.includes(v))
    if (loose.length) return { pass: false, body: <p className="lg-error">{tr(`${loose.join('、')} 不受 ∀ 或 ∃ 约束：它指的是什么？`, `${loose.join(', ')} is not bound by ∀ or ∃: what does it refer to?`)}</p> }
    if (level.kind === 'query') {
      for (const world of level.worlds) {
        const m = structureOf(world, [tree, target])
        const [got, wanted] = [extent(tree, m), extent(target, m)]
        const name = thingName(notation, world)
        const extra = got.filter((d) => !wanted.includes(d)).map(name)
        const missing = wanted.filter((d) => !got.includes(d)).map(name)
        if (extra.length || missing.length) return { pass: false, body: <div className="fo-why"><p>{L(world.title)}{tr('：')}{extra.length > 0 && tr(`多选了 ${extra.join('、')}；`, `wrongly picks ${extra.join(', ')}; `)}{missing.length > 0 && tr(`漏掉了 ${missing.join('、')}。`, `misses ${missing.join(', ')}.`)}</p></div> }
      }
      return { pass: true }
    }
    const d = difference(tree, target)
    if (!d) return { pass: true }
    return {
      pass: false,
      body: (
        <div className="fo-why">
          <p>{d.first ? tr('在下面的世界中，你写的句子为真，原句却为假：') : tr('在下面的世界中，原句为真，你写的句子却为假：')}</p>
          <WorldText model={d.model} notation={notation} preds={level.vocab.preds} spell />
        </div>
      ),
    }
  }
  const judge = () => (strays.length ? { pass: false, body: <p className="lg-error">{L(STRAY)}</p> } : whole ? compare() : { pass: false, body: <p className="lg-error">{tr('还有空位：句子的每个位置都须填写。')}</p> })
  const [verdict, setVerdict] = useKeptVerdict({ lastRun, keepRun }, judge)
  const editor = useRef(null)
  const check = () => {
    editor.current?.clearSelection()
    const v = judge()
    setVerdict(v)
    if (v.pass) solve(null)
  }

  const stage = (
    <div className="fo-stage">
      <p className="fo-say fo-prompt"><Markup text={level.say} /></p>
      {level.kind === 'query' && (
        <div className="fo-worlds">
          {level.worlds.map((world, k) => (
            <details key={k} open={k === 0}>
              <summary>{L(world.title)}</summary>
              <WorldText model={structureOf(world, [target])} notation={notation} preds={level.vocab.preds} world={world} />
            </details>
          ))}
        </div>
      )}
      <TreeEditor tree={tree} onChange={change} chips={chips} language={sentenceLanguage(notation, 'formula', level.kind === 'query' ? ['x'] : [])} scope={`${entry.id}:${level.task}`} ref={editor} />
    </div>
  )
  const results = verdict ? (verdict.pass ? <p className="lg-verdict is-pass" role="status">{level.kind === 'query' ? tr('每一家都选对了。') : tr('在每个小世界中，真假都与原句一致。')}</p> : verdict.body) : null
  const dock = <RunDock go={{ label: verdict?.pass ? L(WORDS.passed) : L(WORDS.check), pass: Boolean(verdict?.pass), onClick: check }} />
  const brief = <Brief game={game} level={entry} hint={level.hint} phone={phone} />
  return <Level phone={phone} className="fo-level" brief={brief} stage={stage} results={results} dock={dock} />
}
