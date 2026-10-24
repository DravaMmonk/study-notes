import { useMemo, useState } from 'react'
import { Brief, PhonePage, RunDock, Workbench } from '../../../shell/index.js'
import { L, tr } from '../../../shell/i18n.js'
import { Chips, Strip, StripTools, useStrip } from '../../../strip/index.js'
import { useHistory } from '../../../circuit/useHistory.js'
import { parse } from '../formula.js'
import { say } from '../notation.js'
import { checkTerm } from '../pterm.js'
import { chipsOf, complete, holesOf, joinsOnto, nodeAt, segmentOf, setAt } from '../termTree.js'

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
  const chips = useMemo(() => chipsOf(level.premises ?? {}, tree), [level, tree])
  const change = (next) => {
    setTree(next)
    save({ tree: next })
    setVerdict(null)
  }
  const history = useHistory(tree, change, `${entry.id}:${level.task ?? 0}`, 0)
  const strip = useStrip({
    put: (slot, key) => {
      const path = pathOf(slot)
      const made = chips.find((c) => c.key === key).make(tree)
      // Onto the term the line ends with (see target): it goes in the form's first box.
      const last = nodeAt(tree, path)
      change(setAt(tree, path, last ? setAt(made, [0], last) : made))
      return null
    },
    take: (slot) => change(setAt(tree, pathOf(slot), null)),
    // The first box; with no box left, a form that starts with its box (□ □, □.1, □.elim …) takes the last term.
    target: (key) => {
      const at = holesOf(tree)[0]?.path ?? (chips.find((c) => c.key === key).leads ? joinsOnto(tree, key) : null)
      return at ? ['r', ...at].join('.') : null
    },
    filled: (slot) => nodeAt(tree, pathOf(slot)) !== null,
    fixed: () => false,
  })
  // Where the next piece goes, always marked: the box picked, else the first box, else after the whole term.
  const first = holesOf(tree)[0]
  const next = strip.selected ?? (first ? ['r', ...first.path].join('.') : complete(tree) ? 'end' : null)
  const check = () => {
    strip.clearSelection()
    if (!complete(tree)) return setVerdict({ pass: false, reason: T('还有框没填：项要每个位置都填上。', 'Some boxes are still empty: every place must be filled.') })
    const hyps = Object.fromEntries(Object.entries(level.premises ?? {}).map(([name, f]) => [name, parse(f, { consts })]))
    const reason = checkTerm(tree, parse(level.goal, { consts }), { hyps, consts, notation: level.notation })
    setVerdict({ pass: !reason, reason })
    if (!reason) solve(null)
  }
  const groups = GROUPS.map(([group, label]) => ({ key: group, label, chips: chips.filter((c) => c.group === group).map((c) => ({ key: c.key, text: c.text, sub: c.sub, family: group })) })).filter((g) => g.chips.length)
  const premises = Object.entries(level.premises ?? {})
  const note = strip.note
    ? <p className={`ks-note ${strip.note.bad ? 'is-bad' : ''}`} role="status">{L(strip.note.text)}</p>
    : <p className="ks-note">{tree ? tr('点下面的块，它会填进第一个框；没有框了，再点 □ □、□.1、□.2、□.elim，它接在最后那个项上。高亮的地方就是下一块要去的位置。点已经填进去的字，把它连同里面的一起拿掉。', 'Tap a piece below and it fills the first box; with no box left, □ □, □.1, □.2 and □.elim take the last term. The highlight marks where the next piece goes. Tap words already in to take them out with all inside.') : tr('从最外面那一层开始：要证的这句话，它的证明是什么形状？', 'Start with the outermost layer: what shape is a proof of this sentence?')}</p>
  const stage = (
    <div className="fo-stage">
      <section className="tm-given">
        {premises.length > 0 && <p>{tr('已知', 'Given')} {premises.map(([name, f]) => <span key={name} className="tm-premise"><code>{name}</code>：{text(f)}</span>)}</p>}
        <p className="fo-say fo-prompt">{tr('要证', 'Prove')} <b>{text(level.goal)}</b></p>
      </section>
      <StripTools history={history} onClear={() => change(null)} empty={!tree} />
      <Strip line={[segmentOf(tree)]} label={T('证明项', 'proof term')} next={next} selected={strip.selected} flash={strip.flash} onSlot={strip.onSlot} />
      {note}
      {verdict && <p className={`lg-verdict ${verdict.pass ? 'is-pass' : 'is-fail'}`} role="status">{verdict.pass ? tr('类型对上了：这个项证的正是这句话。', 'The type matches: this term proves exactly this sentence.') : L(verdict.reason)}</p>}
      <Chips groups={groups} onChip={strip.onChip} />
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
