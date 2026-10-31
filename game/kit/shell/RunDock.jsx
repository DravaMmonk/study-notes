import { createContext, useContext } from 'react'
import { Check, ChevronDown, ChevronUp, Play, SkipForward } from 'lucide-react'
import { tr } from './i18n.js'

// The run bar every level ends in, the same in every game (after 状态之图's): where the level stands (tests, parts),
// a quiet second action (clear, undo a step…), and the big Run button, which skips the animation while a run plays
// and shows a tick once everything passes. The level's frame puts it at the bottom right on a desktop (Workbench.jsx)
// and pinned to the bottom of the page on a phone (Layout.jsx PhonePage), where its first button folds the results
// drawer open and shut, and a run, a step or a check opens it.
//
// meta: a line on where the level stands (a node)   lead: anything before it (an undo button)
// secondary: { label, icon?, onClick?, attrs? }     go: { label, busy?, pass?, pulse?, icon?, onClick?, attrs? }
// controls: [{ key, label, icon, onClick?, attrs? }] small buttons before them (step through a run, pause, go on)
// attrs are spread onto the button, so a page that handles clicks itself (data-act=…) can keep doing so.

/** The phone page's results drawer, for the run bar in it: { has, open, toggle(), show() }. */
export const RunDrawer = createContext(null)

export default function RunDock({ meta, lead, secondary, controls = [], go, className = '' }) {
  const drawer = useContext(RunDrawer)
  // A run, a step or a check opens the drawer, to watch what it gives.
  const showing = (onClick) => (event) => {
    drawer?.show()
    onClick?.(event)
  }
  const icon = go?.icon ?? (go?.busy ? <SkipForward size={17} /> : go?.pass ? <Check size={18} /> : <Play size={16} />)
  const fold = drawer?.open ? tr('收起结果', 'Hide the results') : tr('展开结果', 'Show the results')
  return (
    <div className={`run-dock ${className}`}>
      {lead}
      <div className="run-meta">{meta}</div>
      {drawer?.has && (
        <button type="button" className="run-ctl run-drawer" onClick={drawer.toggle} aria-expanded={drawer.open} aria-label={fold} title={fold}>
          {drawer.open ? <ChevronDown size={18} /> : <ChevronUp size={18} />}<span>{fold}</span>
        </button>
      )}
      {controls.map((c) => (
        <button key={c.key} type="button" className="run-ctl" onClick={showing(c.onClick)} aria-label={c.label} title={c.label} {...c.attrs}>{c.icon}<span>{c.label}</span></button>
      ))}
      {secondary && (
        <button type="button" className="run-sec" onClick={secondary.onClick} aria-label={secondary.label} title={secondary.label} {...secondary.attrs}>{secondary.icon}<span>{secondary.label}</span></button>
      )}
      {go && (
        <button type="button" className={`run-go ${go.busy ? 'is-busy' : ''} ${go.pass ? 'is-pass' : ''} ${go.pulse ? 'is-pulse' : ''}`} onClick={showing(go.onClick)} {...go.attrs}>
          {icon}<span>{go.label}</span>
        </button>
      )}
    </div>
  )
}
