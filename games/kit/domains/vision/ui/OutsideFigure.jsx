import { tr } from '../../../shell/i18n.js'
import { fromRows, fmt } from '../image.js'
import { readOutside } from '../construction.js'

/** Independent numeric evidence for an unobserved neighbour; each convention has a concrete continuation. */
export default function OutsideFigure({ fig }) {
  const mode=fig.replace('outside-','')
  const source=fromRows([[.2,.5,.9]])
  if(mode==='valid')return <figure className="vi-intro-figure vi-outside-figure">
    <div className="vi-outside-scroll"><table><caption>{tr('三格邻域：只保留完整窗口','Three-sample neighbourhood: full windows only')}</caption><tbody><tr>{[0,1,2,3,4].map((x)=><td key={x} data-outside={x===0||x===4}>{tr('中心','Centre')} {x}<strong>{x===0||x===4?'—':'✓'}</strong></td>)}</tr></tbody></table></div>
    <figcaption>{tr('输入宽 5，半径为 1。两端缺邻居；有效输出只保留中心 1、2、3，宽度自动算为 3。','Width 5, radius 1. The endpoints lack neighbours; valid output keeps centres 1, 2, 3, with computed width 3.')}</figcaption>
  </figure>
  const names={zero:tr('图外取 0','Zero extension'),clamp:tr('延续最近边缘','Replicate the nearest edge'),wrap:tr('两端周期相接','Join ends periodically'),reflect:tr('镜像延续，包含边缘格','Reflect including the edge sample')}
  return <figure className="vi-intro-figure vi-outside-figure"><div className="vi-outside-scroll"><table>
    <caption>{names[mode]}</caption><thead><tr>{[-2,-1,0,1,2,3,4].map((x)=><th key={x}>{x}</th>)}</tr></thead>
    <tbody><tr>{[-2,-1,0,1,2,3,4].map((x)=><td key={x} data-outside={x<0||x>2}>{fmt(readOutside(source,x,0,0,mode))}</td>)}</tr></tbody>
  </table></div><figcaption>{tr('列号 0、1、2 是已有读数；虚线格在原图之外，其值来自当前假设。这里是独立示例。','Columns 0, 1, 2 are observations. Dashed cells lie outside and receive values from the stated assumption. This is an independent example.')}</figcaption></figure>
}
