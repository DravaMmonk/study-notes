import { tr } from '../../../../shell/i18n.js'
import './separable.css'

export function SeparableKernels({ ctx }) {
  const { q } = ctx
  const grids = [
    ['want1', tr('目标 1', 'Target 1')], ['out1', tr('结果 1', 'Result 1')],
    ['want2', tr('目标 2', 'Target 2')], ['out2', tr('结果 2', 'Result 2')],
  ]
  return <div className="separable-kernels">{grids.map(([key, label]) => (
    <figure key={key}>
      <figcaption>{label}</figcaption>
      <div className="separable-kernel" aria-label={label}>
        {[0, 1, 2].map((row) => q[key + row].map((v, col) => (
          <span key={`${row}-${col}`} style={{ background: `rgb(${Math.round(v * 255)}, ${Math.round(v * 255)}, ${Math.round(v * 255)})` }} />
        )))}
      </div>
    </figure>
  ))}</div>
}
