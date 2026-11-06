import { useState } from 'react'
import { tr } from '../../../shell/i18n.js'
import { Rich } from '../../../shell/bench/Rich.jsx'
import { fromRows, toRows } from '../image.js'
import { filterImage, sampleImage } from '../operators.js'
import GridInspector from '../../../shell/views/grid/GridInspector.jsx'

/** Independent observations expose a causal contrast without a worksheet gate. */
export default function TheoryFigure({ fig }) {
  const [changed, setChanged] = useState(false)
  if (fig === 'sampling-material') {
    const source = fromRows([[0.1, 0.9]])
    const xs = fromRows([[0, 0.25, 0.5, 0.75, 1]])
    return <figure className="vi-intro-figure">
      <div className="vi-detail-values">
        <GridInspector value={sampleImage(source, xs, 0)} label={tr('复制原有读数', 'Copy original samples')} />
        <GridInspector value={sampleImage(source, xs, 0, { method: 'bilinear' })} label={tr('按距离混合', 'Mix by distance')} />
      </div>
      <figcaption><Rich text={tr('若数值代表区域编号，混合会产生没有定义的类别；若数值代表连续亮度，混合可以表示中间位置。两者都没有增加原图的真实观测。<wiki-ref to="nearest-neighbour-interpolation"></wiki-ref> · <wiki-ref to="bilinear-interpolation"></wiki-ref>', 'If values identify regions, a mixture can invent an undefined class. For continuous intensity, a mixture can represent an intermediate location. Neither adds measured detail. <wiki-ref to="nearest-neighbour-interpolation"></wiki-ref> · <wiki-ref to="bilinear-interpolation"></wiki-ref>')} /></figcaption>
    </figure>
  }
  if (fig === 'separable') {
    const row = [0.2, 0.6, 0.2], column = [0.25, 0.5, 0.25]
    return <figure className="vi-intro-figure">
      <p>{tr('行权重', 'Row weights')} [0.2, 0.6, 0.2] · {tr('列权重', 'Column weights')} [0.25, 0.5, 0.25]</p>
      <GridInspector value={fromRows(column.map((v) => row.map((h) => h * v)))} label={tr('两次处理的合成核', 'The effective kernel of two passes')} />
      <figcaption><Rich text={tr('每格权重是一个行权重乘一个列权重。这里每个输出的乘法次数由 9 次变成 3 + 3 次；边界假设要一致。只有能这样分解的核才有这种等价性。<wiki-ref to="separable-filter"></wiki-ref>', 'Each weight is a row weight times a column weight. Here the multiplication count per output changes from 9 to 3 + 3; boundary assumptions must agree. This equivalence applies only to factorable kernels. <wiki-ref to="separable-filter"></wiki-ref>')} /></figcaption>
    </figure>
  }
  const source = fromRows(fig === 'smoothing' ? [[0.3, 0.7, 0.3, 0.7, 0.3]] : [changed ? [0.8, 0.8, 0.2, 0.2, 0.2] : [0.2, 0.2, 0.8, 0.8, 0.8]])
  const weights = fig === 'smoothing' ? (changed ? [1, 2, 1] : [0.25, 0.5, 0.25]) : [-1, 0, 1]
  const result = filterImage(source, fromRows([weights]))
  return <figure className="vi-intro-figure">
    <div className="vi-detail-values">
      <GridInspector value={source} label={tr('输入', 'Input')} />
      <GridInspector value={result} label={tr('邻域响应', 'Neighbourhood response')} />
    </div>
    <p>{tr('位置权重', 'Positional weights')}: [{weights.join(', ')}] · {tr('和', 'Sum')}: {weights.reduce((a, b) => a + b, 0)}</p>
    <button type="button" className="vi-primer-switch" onClick={() => setChanged(!changed)}>{fig === 'smoothing' ? tr('切换归一化前后', 'Toggle normalisation') : tr('反转明暗', 'Reverse contrast')}</button>
    <figcaption><Rich text={fig === 'smoothing' ? tr('恒定区域的输出是原值乘权重和；权重和为 1 才能保持亮度。平均邻居也会减弱有用细节。<wiki-ref to="gaussian-filter"></wiki-ref>', 'A constant region is multiplied by the sum of weights; a sum of 1 preserves its intensity. Averaging also weakens useful detail. <wiki-ref to="gaussian-filter"></wiki-ref>') : tr('右邻减左邻：反转明暗会反转响应的正负，分界仍在相同位置。这是亮度变化的方向，不是物体类别。<wiki-ref to="sobel-filter"></wiki-ref>', 'Right minus left: reversing contrast reverses the response sign while retaining the transition location. This describes intensity change, not an object class. <wiki-ref to="sobel-filter"></wiki-ref>')} /></figcaption>
    <small>{tr('计算结果', 'Computed values')}: {toRows(result)[0].map((v) => Number(v.toFixed(3))).join(' · ')}</small>
  </figure>
}
