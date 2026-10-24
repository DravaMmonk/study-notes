import { L, tr } from '../shell/i18n.js'

// The strip: what is being built, written out as it reads, with a framed box for every place still empty, the way a
// calculator writes a formula in natural display. A piece put in is plain text from then on, and its own empty places
// are boxes inside it; tapping a piece's words takes the piece out (with everything inside it), tapping a box selects
// it. The same on a desktop and a phone: one tap, no wires, and no separate read-back: the strip is the sentence.
//
//   line     [segment]   the whole thing in reading order
//   segment  a string (text that belongs to no piece: a full stop, a fixed word)
//          | { hole: key, label: { zh, en } }                    an empty place, its label written faintly inside
//          | { piece: key, family?, fixed?, dim?, bad?, parts: [segment] }  a piece put in: its strings are its words
//            (`bad`: marked red, it does not belong where it stands yet)
//   next      where the next chip goes, always marked: a hole's key, or 'end' (a caret after the line, where a piece
//             that joins on after the last whole thing goes)
//   selected  the hole picked to receive the next chip      flash  keys just refused (they shake)
//   onSlot(key)  a hole or a piece was tapped

export function Strip({ line, label, next = null, selected, flash = [], onSlot }) {
  return (
    <div className="ks-strip" role="group" aria-label={L(label) ?? tr('句子', 'Sentence')}>
      <Segments parts={line} next={next} selected={selected} flash={flash} onSlot={onSlot} />
      {next === 'end' && <span className="ks-caret" aria-hidden="true" />}
    </div>
  )
}

function Segments({ parts, owner = null, next, selected, flash, onSlot }) {
  return parts.map((part, k) => {
    if (typeof part === 'string') {
      if (!owner) return <span key={k} className="ks-plain">{part}</span>
      return (
        <button key={k} type="button" className={`ks-word ${owner.dim ? 'is-dim' : ''} ${part.trim() ? '' : 'is-gap'}`} data-family={owner.family} data-piece={owner.piece} disabled={owner.fixed} onClick={() => onSlot(owner.piece)} aria-label={owner.fixed ? part : tr(`${part.trim() || '空格'}：点一下拿掉`, `${part.trim() || 'space'}: tap to take out`)}>
          {part}
        </button>
      )
    }
    if (part.hole) {
      const name = L(part.label)
      return (
        <button key={part.hole} type="button" className={`ks-hole ${selected === part.hole ? 'is-selected' : ''} ${next === part.hole ? 'is-next' : ''} ${flash.includes(part.hole) ? 'is-refused' : ''}`} data-slot={part.hole} aria-pressed={selected === part.hole} onClick={() => onSlot(part.hole)} aria-label={tr(`${name}：空，点一下选中`, `${name}: empty; tap to select`)}>
          {name}
        </button>
      )
    }
    return (
      <span key={part.piece} className={`ks-piece ${part.bad ? 'is-bad' : ''} ${flash.includes(part.piece) ? 'is-refused' : ''}`} data-family={part.family}>
        <Segments parts={part.parts} owner={part} next={next} selected={selected} flash={flash} onSlot={onSlot} />
      </span>
    )
  })
}

/**
 * The tray of chips under a strip: tap one to put it in the selected box, or in the first empty box that takes it.
 * A chip in use is greyed out; a locked group is dimmed but still answers a tap (the game says why it is locked).
 * groups: [{ key, label, locked?, chips: [{ key, text, sub?, family?, used? }] }]
 */
export function Chips({ groups, onChip }) {
  return (
    <div className="ks-chips">
      {groups.map((g) => (
        <section key={g.key} className={`ks-chip-group ${g.locked ? 'is-locked' : ''}`} aria-label={L(g.label)}>
          <span className="ks-chip-label">{L(g.label)}</span>
          <div className="ks-chip-row">
            {g.chips.map((c) => (
              <button key={c.key} type="button" className="ks-chip" data-family={c.family} disabled={c.used} onClick={() => onChip(c.key)} title={L(c.sub)}>
                <b>{c.text}</b>
                {c.sub && <small>{L(c.sub)}</small>}
              </button>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
