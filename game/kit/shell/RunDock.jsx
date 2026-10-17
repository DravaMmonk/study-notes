import { Check, Play, SkipForward } from 'lucide-react'

// The run bar every level ends in, the same in every game (after 状态之图's): where the level stands (tests, parts),
// a quiet second action (clear, undo a step…), and the big Run button, which skips the animation while a run plays
// and shows a tick once everything passes. It sits at the bottom of the side column on a desktop and pinned to the
// bottom of the page on a phone.
//
// meta: a line on where the level stands (a node)   lead: anything before it (an undo button)
// secondary: { label, armed?, onClick?, attrs? }     go: { label, busy?, pass?, pulse?, icon?, onClick?, attrs? }
// attrs are spread onto the button, so a page that handles clicks itself (data-act=…) can keep doing so.

export default function RunDock({ meta, lead, secondary, go, className = '' }) {
  const icon = go?.icon ?? (go?.busy ? <SkipForward size={17} /> : go?.pass ? <Check size={18} /> : <Play size={16} />)
  return (
    <div className={`run-dock ${className}`}>
      {lead}
      <div className="run-meta">{meta}</div>
      {secondary && (
        <button type="button" className={`run-sec ${secondary.armed ? 'is-armed' : ''}`} onClick={secondary.onClick} {...secondary.attrs}>{secondary.label}</button>
      )}
      {go && (
        <button type="button" className={`run-go ${go.busy ? 'is-busy' : ''} ${go.pass ? 'is-pass' : ''} ${go.pulse ? 'is-pulse' : ''}`} onClick={go.onClick} {...go.attrs}>
          {icon}<span>{go.label}</span>
        </button>
      )}
    </div>
  )
}
