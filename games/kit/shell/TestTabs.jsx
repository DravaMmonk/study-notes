import { Check, Circle, Image, X } from 'lucide-react'
import { L, keyOf, tr } from './i18n.js'
import { useEdit, useMark } from './edit.js'
import { AddMark } from './EditMarks.jsx'

/**
 * A level's tests as tabs, the same in every game: in a circuit level's strip on a desktop (a row of chips) or across
 * the top of the phone page. Each shows whether it passed once checked, and hidden tests (shown once the level is
 * solved) say so; a sample (a larger picture the board also runs on, never judged) shows a picture instead. While the
 * studio edits, each tab is a test of the content to pick (edit.js), and a + adds one.
 *
 *   tests   [{ label, hidden?, sample? }]   states  ['pass' | 'fail' | null]   index, onSelect(index)   phone
 */
export default function TestTabs({ tests, states, index, onSelect, phone = false }) {
  const edit = useEdit()
  const mark = useMark()
  const shown = tests.filter((t) => !t.hidden && !t.sample).length
  const tabs = tests.map((t, k) => {
    const state = states[k] ?? null
    return (
      <button key={`${k}-${keyOf(t.label)}`} type="button" {...mark(t.sample ? 'sample' : t.hidden ? `hidden[${k - shown}]` : `tests[${k}]`, 'task', () => onSelect(k))} className={`${phone ? 'pb-test' : 'test-row'} ${k === index ? (phone ? 'is-on' : 'is-active') : ''} ${state ? `is-${state}` : ''} ${t.sample ? 'is-sample' : ''}`} onClick={() => onSelect(k)} aria-pressed={k === index}>
        {t.sample ? <Image size={phone ? 12 : 13} /> : state === 'pass' ? <Check size={phone ? 12 : 13} /> : state === 'fail' ? <X size={phone ? 12 : 13} /> : <Circle size={phone ? 10 : 11} />}
        <span>{L(t.label)}</span>
        {t.hidden && <em className="hidden-tag">{tr('隐藏')}</em>}
      </button>
    )
  })
  const add = edit && <AddMark at="tests" label={{ zh: '测试', en: 'a test' }} />
  if (phone) return <nav className="pb-tests" aria-label={tr('测试')}>{tabs}{add}</nav>
  return <ol className="test-list">{tabs.map((tab) => <li key={tab.key}>{tab}</li>)}{add && <li>{add}</li>}</ol>
}
