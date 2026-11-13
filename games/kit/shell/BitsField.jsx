import { L, tr } from './i18n.js'

// A run of bits the player sets, a tick each: every tick a key that flips its bit. Shared by whatever asks for what
// arrives on a wire (a check's row, Checks.jsx).
//
//   <BitsField label={{ zh, en }} value={[0 | 1 per tick]} onChange={(bits) => …} />
export default function BitsField({ label, value, onChange }) {
  return (
    <div className="bf" role="group" aria-label={L(label)}>
      {value.map((bit, t) => (
        <button key={t} type="button" className={`bf-bit ${bit ? 'is-on' : ''}`} aria-pressed={Boolean(bit)} aria-label={tr(`第 ${t} 拍`, `Tick ${t}`)} onClick={() => onChange(value.map((v, j) => (j === t ? 1 - v : v)))}>{bit}</button>
      ))}
    </div>
  )
}
