import { tr } from '../../../shell/i18n.js'
import { Rich } from '../../../shell/bench/Rich.jsx'
import { calculationAt } from '../calculation.js'
import { fmt } from '../image.js'

const text = (value) => Array.isArray(value) ? `(${value.map(fmt).join(', ')})` : fmt(value)
const product = (value, weight) => Array.isArray(value) ? value.map((v) => v * weight) : value * weight
const TERM = { nearest: 'nearest-neighbour-interpolation', bilinear: 'bilinear-interpolation', window: 'linear-filter', product: 'separable-filter', magnitude: 'image-gradient' }

/** Spatial evidence and automatic arithmetic for the currently selected output cell. */
export default function CalculationAid({ task, rows, at, select, apply }) {
  const result = calculationAt(task, at.x, at.y)
  const width = rows[0].length, count = width * rows.length, index = at.y * width + at.x
  const move = (i) => select({ x: i % width, y: Math.floor(i / width) })
  return <section className="vi-calculation" aria-label={tr('计算与取样信息', 'Calculation and sampling information')}>
    <header><h3>{tr('输出格', 'Output cell')} ({at.x}, {at.y})</h3><nav aria-label={tr('选择计算位置', 'Select calculation position')}><button type="button" disabled={index === 0} onClick={() => move(index - 1)} aria-label={tr('前一格', 'Previous cell')}>←</button><span>{index + 1} / {count}</span><button type="button" disabled={index === count - 1} onClick={() => move(index + 1)} aria-label={tr('后一格', 'Next cell')}>→</button></nav></header>
    {result.sx !== undefined && <p>{tr('取样', 'Sample')} ({fmt(result.sx)}, {fmt(result.sy)}){result.kind === 'nearest' && <> → {tr('读取', 'read')} ({result.terms[0].cx}, {result.terms[0].cy})</>}</p>}
    {result.centre && <p>{tr('输入中心', 'Input centre')} ({result.centre.x}, {result.centre.y}) → {tr('输出', 'output')} ({at.x}, {at.y})</p>}
    <details className="vi-calculation-details"><summary>{tr('计算过程', 'Calculation details')}</summary><div>
    <Rich text={`<wiki-ref to="${TERM[result.kind]}"></wiki-ref>`} />
    {result.kind === 'nearest' && <>
      <dl className="vi-distances">{result.distances.map((d, k) => <div key={k}><dt>{'xy'[k]}</dt><dd>{tr('到', 'To')} {d.lo}：{fmt(d.left)} · {tr('到', 'to')} {d.hi}：{fmt(d.right)}<strong>→ {tr('最近整数', 'nearest integer')} {result.nearest[k]}</strong></dd></div>)}</dl>
      <p>{result.distances.some((d) => Math.abs(d.left - d.right) < 1e-9) ? tr('两边等距时，按本关约定选较大的整数。', 'An equal-distance tie takes the larger integer in this task.') : tr('距离已自动计算，选择距离较小的一边。', 'Distances are calculated automatically; select the nearer integer.')}</p>
    </>}
    {result.kind === 'bilinear' && <p>{tr('横向比例', 'Horizontal fraction')} {fmt(result.tx)} · {tr('纵向比例', 'Vertical fraction')} {fmt(result.ty)}<br />{tr('各邻居的权重、乘积与总和已自动计算。', 'Neighbour weights, products and sum are calculated automatically.')}</p>}
    {result.terms && <ul className="vi-calculation-terms">{result.terms.map((t, k) => <li key={k}><div><strong>({t.x}, {t.y})</strong>{t.outside && <small>{result.kind === 'window' ? tr('图外补 0', 'Zero outside') : tr(`图外 → 边界 (${t.cx}, ${t.cy})`, `Outside → boundary (${t.cx}, ${t.cy})`)}</small>}<span>{tr('读数', 'Value')} {text(t.value)}</span></div><span>{result.kind === 'nearest' ? '' : `× ${fmt(t.weight)} = ${text(product(t.value, t.weight))}`}</span></li>)}</ul>}
    {result.kind === 'window' || result.kind === 'bilinear' ? <p className="vi-calculation-expression">{result.terms.map((t) => text(product(t.value, t.weight))).join(' + ')} = {text(result.value)}</p> : null}
    {result.kind === 'product' && <p className="vi-calculation-expression">{tr('纵向权重表', 'Column weights')} [{task.calculation.column.map(fmt).join(', ')}]<br />{tr('横向权重', 'Row weight')} {text(result.a)} × {tr('纵向权重', 'column weight')} {text(result.b)} = {text(result.value)}</p>}
    {result.kind === 'magnitude' && <p className="vi-calculation-expression">gx = {fmt(result.gx)} · gy = {fmt(result.gy)}<br />gx² + gy² = {fmt(result.gx ** 2)} + {fmt(result.gy ** 2)} = {fmt(result.gx ** 2 + result.gy ** 2)}<br />√{fmt(result.gx ** 2 + result.gy ** 2)} = {fmt(result.value)}</p>}
    </div></details>
    <footer><strong>{tr('计算结果', 'Calculated value')} <output>{text(result.value)}</output></strong><button type="button" onClick={() => { apply(result.value); if (index + 1 < count) move(index + 1) }}>{index + 1 < count ? tr('填入并继续', 'Fill and next') : tr('填入结果', 'Fill result')}</button></footer>
  </section>
}
