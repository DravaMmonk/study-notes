import { useMemo, useState } from 'react'
import { Trash2 } from 'lucide-react'
import { Brief, PhonePage, RunDock, Workbench } from '../../../shell/index.js'
import { L, tr } from '../../../shell/i18n.js'
import { Chips, Strip, useStrip } from '../../../strip/index.js'
import { parse } from '../formula.js'
import { say } from '../notation.js'
import { checkTerm } from '../pterm.js'
import { chipsOf, complete, holesOf, nodeAt, segmentOf, setAt } from '../termTree.js'

// Term tasks (《证明完毕》 chapter 6): the named premises and the sentence to prove, and a proof term built from
// chips on the shared strip (games/kit/strip), written out as it reads with a box for each empty place. The machine
// checks the finished term's type is that sentence (pterm.js), and says where it is not.
//
//   level  { kind: 'term', premises: { name: formula text }, goal: formula text, answer: term text, naive?, consts? }

const T = (zh, en) => ({ zh, en })
const GROUPS = [['name', T('名字', 'Names')], ['form', T('写法', 'Forms')]]
const pathOf = (key) => key.split('.').slice(1).map(Number)

export default function TermScreen({ game, level: entry, saved, save, solve, phone }) {
  const level = entry.source
  const consts = level.consts ?? []
  const text = (f) => L(say(parse(f, { consts }), level.notation))
  const [tree, setTree] = useState(() => saved?.tree ?? null)
  const [verdict, setVerdict] = useState(null)
  const [armed, setArmed] = useState(false)
  const chips = useMemo(() => chipsOf(level.premises ?? {}, tree), [level, tree])
  const change = (next) => {
    setTree(next)
    save({ tree: next })
    setVerdict(null)
  }
  const strip = useStrip({
    put: (slot, key) => {
      change(setAt(tree, pathOf(slot), chips.find((c) => c.key === key).make(tree)))
      return null
    },
    take: (slot) => change(setAt(tree, pathOf(slot), null)),
    target: () => { const hole = holesOf(tree)[0]; return hole ? ['r', ...hole.path].join('.') : null },
    filled: (slot) => nodeAt(tree, pathOf(slot)) !== null,
    fixed: () => false,
  })
  const check = () => {
    strip.clearSelection()
    if (!complete(tree)) return setVerdict({ pass: false, reason: T('还有框没填：项要每个位置都填上。', 'Some boxes are still empty: every place must be filled.') })
    const hyps = Object.fromEntries(Object.entries(level.premises ?? {}).map(([name, f]) => [name, parse(f, { consts })]))
    const reason = checkTerm(tree, parse(level.goal, { consts }), { hyps, consts, notation: level.notation })
    setVerdict({ pass: !reason, reason })
    if (!reason) solve(null)
  }
  const clear = () => {
    if (!armed) {
      setArmed(true)
      window.setTimeout(() => setArmed(false), 2600)
      return
    }
    setArmed(false)
    change(null)
  }
  const groups = GROUPS.map(([group, label]) => ({ key: group, label, chips: chips.filter((c) => c.group === group).map((c) => ({ key: c.key, text: c.text, sub: c.sub, family: group })) })).filter((g) => g.chips.length)
  const premises = Object.entries(level.premises ?? {})
  const note = strip.note
    ? <p className={`ks-note ${strip.note.bad ? 'is-bad' : ''}`} role="status">{L(strip.note.text)}</p>
    : <p className="ks-note">{tree ? tr('点下面的块，它会填进第一个框；点已经填进去的字，把它连同里面的一起拿掉。', 'Tap a piece below and it fills the first box; tap words already in to take them out with all inside.') : tr('从最外面那一层开始：要证的这句话，它的证明是什么形状？', 'Start with the outermost layer: what shape is a proof of this sentence?')}</p>
  const stage = (
    <div className="fo-stage">
      <section className="tm-given">
        {premises.length > 0 && <p>{tr('已知', 'Given')} {premises.map(([name, f]) => <span key={name} className="tm-premise"><code>{name}</code>：{text(f)}</span>)}</p>}
        <p className="fo-say fo-prompt">{tr('要证', 'Prove')} <b>{text(level.goal)}</b></p>
      </section>
      <Strip line={[segmentOf(tree)]} label={T('证明项', 'proof term')} selected={strip.selected} flash={strip.flash} onSlot={strip.onSlot} />
      {note}
      {verdict && <p className={`lg-verdict ${verdict.pass ? 'is-pass' : 'is-fail'}`} role="status">{verdict.pass ? tr('类型对上了：这个项证的正是这句话。', 'The type matches: this term proves exactly this sentence.') : L(verdict.reason)}</p>}
      <Chips groups={groups} onChip={strip.onChip} />
      <footer className="run-foot">
        <RunDock
          secondary={tree ? { label: armed ? tr('确认清空', 'Confirm clear') : tr('清空', 'Clear'), icon: <Trash2 size={16} />, armed, onClick: clear } : null}
          go={{ label: verdict?.pass ? tr('对了', 'Right') : tr('检查', 'Check'), pass: Boolean(verdict?.pass), onClick: check }}
        />
      </footer>
    </div>
  )
  const brief = <Brief game={game} level={entry} hint={level.hint} phone={phone} />
  if (phone) return <PhonePage brief={brief} className="fo-level tm-level">{stage}</PhonePage>
  return <Workbench className="fo-level tm-level" brief={brief} stage={stage} scroll />
}
