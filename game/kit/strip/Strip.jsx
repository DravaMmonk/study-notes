import { L, tr } from '../shell/i18n.js'

// A strip of typed slots in reading order, nested into labelled groups: a bracketed tree the player fills from a
// tray of chips, the same on a desktop and a phone (one tap, no wires). Where a circuit says how data flows, a strip
// says how a sequence is built: each group is a constituent, and its bracket and label sit under its slots.
//
//   tree   { key, label?, items: [node] }   node: a group (the same shape) or a slot
//   slot   { key, label, value?: { text, sub?, family?, dim? }, fixed?, lead?, family? }
//          `value` is what fills it (null: empty); `fixed` slots belong to the level and cannot be emptied; `lead`
//          is a word the slot always says before its value (a preposition, say)
//   selected  the slot key picked to receive the next chip       flash  slot keys just refused (they shake)
//   onSlot(key)  a slot was tapped

export function Strip({ tree, selected, flash = [], onSlot }) {
  return (
    <div className="ks-strip" role="group" aria-label={L(tree.label) ?? tr('句子', 'Sentence')}>
      <Group node={tree} top selected={selected} flash={flash} onSlot={onSlot} />
    </div>
  )
}

function Group({ node, top, selected, flash, onSlot }) {
  return (
    <div className={`ks-group ${top ? 'is-top' : ''}`}>
      <div className="ks-row">
        {node.items.map((item) => (item.items
          ? <Group key={item.key} node={item} selected={selected} flash={flash} onSlot={onSlot} />
          : <Slot key={item.key} slot={item} selected={selected === item.key} flash={flash.includes(item.key)} onSlot={onSlot} />))}
      </div>
      {node.label && <span className="ks-bracket">{L(node.label)}</span>}
    </div>
  )
}

function Slot({ slot, selected, flash, onSlot }) {
  const v = slot.value
  const name = L(slot.label)
  return (
    <div className="ks-cell">
      <span className="ks-line">
        {slot.lead && <span className="ks-lead">{slot.lead}</span>}
        <button
          type="button"
          className={`ks-slot ${v ? 'is-filled' : 'is-empty'} ${slot.fixed ? 'is-fixed' : ''} ${selected ? 'is-selected' : ''} ${flash ? 'is-refused' : ''}`}
          data-family={v?.family ?? slot.family}
          data-slot={slot.key}
          onClick={() => onSlot(slot.key)}
          aria-pressed={selected}
          aria-label={v ? tr(`${name}：${v.text}${slot.fixed ? '' : '，点一下拿掉'}`, `${name}: ${v.text}${slot.fixed ? '' : '; tap to take it out'}`) : tr(`${name}：空，点一下选中`, `${name}: empty; tap to select`)}
        >
          <b className={v?.dim ? 'is-dim' : ''}>{v ? v.text : '＋'}</b>
          {v?.sub && <small>{L(v.sub)}</small>}
        </button>
      </span>
      <span className="ks-label">{name}</span>
    </div>
  )
}

/**
 * The tray of chips under a strip: tap one to put it in the selected slot, or in the first empty slot that takes
 * it. A chip in use is greyed out.  groups: [{ key, label, chips: [{ key, text, sub?, family?, used? }] }]
 */
export function Chips({ groups, onChip }) {
  return (
    <div className="ks-chips">
      {groups.map((g) => (
        <section key={g.key} className="ks-chip-group" aria-label={L(g.label)}>
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
