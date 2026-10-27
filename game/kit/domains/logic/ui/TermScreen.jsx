import { useState } from 'react'
import { Brief, PhonePage, RunDock, Workbench, useKeptVerdict } from '../../../shell/index.js'
import { L, tr } from '../../../shell/i18n.js'
import { parse } from '../formula.js'
import { say } from '../notation.js'
import { parseTerm } from '../pterm.js'
import { termTaskOf } from '../termTask.js'
import { complete } from '../termTree.js'
import TermEditor from './TermEditor.jsx'

// Term tasks (《证明完毕》 chapter 6): the named premises and the sentence to prove, and a proof term built from
// chips on the shared strip (games/kit/strip), written out as it reads with a box for each empty place. The machine
// checks the finished term's type is that sentence (pterm.js), and says where it is not.
//
//   level  { kind: 'term', premises: { name: formula text }, goal: formula text, answer: term text, given?: term text
//            (a term to start from, written by someone else, to check and mend), naive?, consts? (names of things,
//            chips too), uses?: [lemma] (lemmas offered as chips, used as functions of their premises), forms?: [form
//            key] (the forms the strip offers, termTree.js; the first ten by default), defs?: [equation] (two sentences
//            are one when these work them out alike) }

const T = (zh, en) => ({ zh, en })

export default function TermScreen({ game, level: entry, saved, save, solve, lastRun, keepRun, phone }) {
  const level = entry.source
  const consts = level.consts ?? []
  const text = (f) => L(say(parse(f, { consts }), level.notation))
  // A task may hand over someone else's term to check and mend (`given`); clearing starts from nothing.
  const [tree, setTree] = useState(() => saved?.tree ?? (level.given ? parseTerm(level.given) : null))
  const judge = () => {
    if (!complete(tree)) return { pass: false, reason: T('还有框没填：证明项要每个位置都填上。', 'Some boxes are still empty: every place must be filled.') }
    const reason = termTaskOf(level).check(tree)
    return { pass: !reason, reason }
  }
  const [verdict, setVerdict] = useKeptVerdict({ lastRun, keepRun }, judge)
  const change = (next) => {
    setTree(next)
    save({ tree: next })
    setVerdict(null)
  }
  const check = () => {
    const v = judge()
    setVerdict(v)
    if (v.pass) solve(null)
  }
  const premises = Object.entries(level.premises ?? {})
  const stage = (
    <div className="fo-stage">
      <section className="tm-given">
        {premises.length > 0 && <p>{tr('已知', 'Given')} {premises.map(([name, f]) => <span key={name} className="tm-premise"><code>{name}</code>：{text(f)}</span>)}</p>}
        <p className="fo-say fo-prompt">{tr('要证', 'Prove')} <b>{text(level.goal)}</b></p>
      </section>
      <TermEditor tree={tree} onChange={change} scope={[...Object.keys(level.premises ?? {}), ...(level.uses ?? []), ...consts]} forms={level.forms} history={`${entry.id}:${level.task ?? 0}`}>
        {verdict && <p className={`lg-verdict ${verdict.pass ? 'is-pass' : 'is-fail'}`} role="status">{verdict.pass ? tr('类型对上了：这个证明项证的正是这句话。', 'The type matches: this proof term proves exactly this sentence.') : L(verdict.reason)}</p>}
      </TermEditor>
      <footer className="run-foot">
        <RunDock
          go={{ label: verdict?.pass ? tr('对了', 'Right') : tr('检查', 'Check'), pass: Boolean(verdict?.pass), onClick: check }}
        />
      </footer>
    </div>
  )
  const brief = <Brief game={game} level={entry} hint={level.hint} phone={phone} />
  if (phone) return <PhonePage brief={brief} className="fo-level tm-level">{stage}</PhonePage>
  return <Workbench className="fo-level tm-level" brief={brief} stage={stage} scroll />
}
