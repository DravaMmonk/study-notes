import { tr } from '../../../shell/i18n.js'

// Two bars of one length (a fill ask's `strip`, ../grid.js): `old` pixels above, each a cell of width 1 centred on its
// index, their centres and edges marked in x; `new` pixels below sharing the same length, numbered but not placed.
// The x values the player has typed are marked on the old bar, so a wrong one shows where it falls.

const W = 360
const fix = (v) => Number(v.toFixed(2))

export default function Strips({ old, new: count, marks = [] }) {
  const x = (v) => 24 + ((v + 0.5) / old) * (W - 48)
  const bar = (y, n, label, cells) => (
    <g>
      <text className="vs-note" x={4} y={y - 8}>{label}</text>
      {Array.from({ length: n }, (_, k) => {
        const [a, b] = [x(-0.5 + (k * old) / n), x(-0.5 + ((k + 1) * old) / n)]
        return <g key={k}><rect className="vs-cell" x={a} y={y} width={b - a} height={28} />{cells(k, (a + b) / 2, y)}</g>
      })}
    </g>
  )
  const edges = Array.from({ length: old + 1 }, (_, k) => k - 0.5)
  return (
    <svg className="vi-strips" viewBox={`0 0 ${W} 142`} role="img" aria-label={tr('新旧两排像素占同一段长度', 'The old and new rows over one length')}>
      {bar(26, old, tr('原图', 'Original'), (k, cx, y) => <><circle className="vs-centre" cx={cx} cy={y + 8} r={2.5} /><text className="vs-num" x={cx} y={y + 22}>x = {k}</text></>)}
      {edges.map((e) => <text key={e} className="vs-edge" x={x(e)} y={80}>{fix(e)}</text>)}
      {marks.filter((m) => m !== null && m !== undefined && Number.isFinite(m)).map((m, k) => <path key={k} className="vs-mark" d={`M ${x(m)} 54 l -6 11 h 12 z`} />)}
      {bar(108, count, tr('新图', 'New'), (k, cx, y) => <text className="vs-num" x={cx} y={y + 19}>{k}</text>)}
    </svg>
  )
}
