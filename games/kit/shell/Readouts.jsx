import { L } from './i18n.js'

// The numbers a level reads off a board, under its task (games/DESIGN.md 6.10): a row of cells, each a number over
// its name, the same in every game. items: [{ value, label, pass? }], a falsy item left out.

export default function Readouts({ items }) {
  return (
    <div className="readouts">
      {items.filter(Boolean).map(({ value, label, pass }) => (
        <div key={L(label)} className={pass ? 'is-pass' : undefined}><b>{value}</b><span>{L(label)}</span></div>
      ))}
    </div>
  )
}
