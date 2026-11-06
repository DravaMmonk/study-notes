import { useState } from 'react'
import { tr } from '../../../shell/i18n.js'
import { Rich } from '../../../shell/bench/Rich.jsx'
import { fromRows, fmt } from '../image.js'
import Show from '../../../views/Show.jsx'

// Visual thesis: a working optical instrument, compact readings, and one causal change per interaction.
// Content: apparatus/context, independent evidence, computed contributions. Interaction: toggle a specimen,
// move an inspected window, or change a wave parameter; no target matching or extra assessment gate.
function Apparatus() {
  return <svg className="vi-apparatus" viewBox="0 0 560 230" role="img" aria-label={tr('质检台：相机在固定照明下拍摄传送带上的工件，屏幕显示比较图像', 'Inspection station: a camera observes conveyor items under fixed illumination; a monitor shows image comparisons')}>
    <defs>
      <linearGradient id="vi-metal" x2="0.2" y2="1"><stop stopColor="#788089"/><stop offset=".3" stopColor="#b8b9ae"/><stop offset=".5" stopColor="#656d71"/><stop offset="1" stopColor="#303a40"/></linearGradient>
      <linearGradient id="vi-belt" x2="0" y2="1"><stop stopColor="#4c5050"/><stop offset="1" stopColor="#1e292b"/></linearGradient>
    </defs>
    <ellipse cx="278" cy="210" rx="239" ry="11" fill="#000" opacity=".22"/>
    <path d="M68 167v40h15v-37m291-4v41h15v-40" fill="url(#vi-metal)" stroke="#88918b"/>
    <path d="M45 137h355l37 34H76z" fill="url(#vi-belt)" stroke="#8a918a"/>
    {[0,1,2,3,4,5,6,7,8].map((k)=><path key={k} d={`M${65+k*37} 140l29 27`} stroke="#707975" opacity=".4"/>)}
    <path d="M76 171h361v17H76z" fill="url(#vi-metal)"/><path d="M45 137v16l31 35v-17" fill="#414e53"/>
    {[93,159,225,291,357,412].map((x)=><circle key={x} cx={x} cy="180" r="3" fill="#1d272b" stroke="#b1b6aa"/>)}
    <path d="M161 143l42-19 58 14-41 21z" fill="#c0b9a6" stroke="#e7debf"/><path d="M172 143l31-13 44 10-29 12z" fill="#79807b"/><path d="M191 136l20 5 13-6" fill="none" stroke="#242c2e" strokeWidth="3"/>
    <path d="M88 136V37h203v18H106v81" fill="url(#vi-metal)" stroke="#7a8587"/>
    <path d="M192 55v18h47V55" fill="#495c64"/><rect x="177" y="65" width="77" height="38" rx="5" fill="#657982" stroke="#b2c4c5"/>
    <path d="M202 103v13h26v-13" fill="#17262b" stroke="#8babae"/><ellipse cx="215" cy="116" rx="13" ry="5" fill="#68bcc0"/>
    <path d="M202 119l-24 14m50-14 23 15" stroke="#d8b96e" strokeDasharray="3 4" opacity=".6"/>
    <path d="M139 99l20-8 8 7-21 8zm132-5 20 9-7 8-21-10z" fill="#d6d6b5"/>
    <rect x="348" y="52" width="162" height="95" rx="5" fill="#617174" stroke="#a8b1a3"/>
    <rect x="356" y="60" width="146" height="78" rx="2" fill="#13252a"/>
    <rect x="366" y="74" width="56" height="44" fill="#626b65"/><rect x="435" y="74" width="56" height="44" fill="#626b65"/>
    <path d="M378 85h30v23h-30zm69 0h30v23h-30z" fill="#b6ad90"/><path d="M464 85v13h13" fill="none" stroke="#e8bd63" strokeWidth="4"/>
    <path d="M416 147v22h-17v6h60v-6h-17v-22" fill="url(#vi-metal)"/>
    <circle cx="492" cy="143" r="2" fill="#b6d49f"/>
    <text x="214" y="26" textAnchor="middle">{tr('固定照明与相机', 'Fixed light and camera')}</text>
    <text x="429" y="40" textAnchor="middle">{tr('观测与合格参照', 'Observation and reference')}</text>
    <text x="227" y="218" textAnchor="middle">{tr('传送带上的待检工件', 'Item under inspection')}</text>
  </svg>
}
function WaveDemo({ fig }) {
  const [frequency, setFrequency] = useState(1)
  const [phase, setPhase] = useState(0)
  const n = 16
  const basis = Array.from({length:n},(_,x)=>Math.cos(2*Math.PI*(frequency*x/n+phase)))
  const signal = Array.from({length:n},(_,x)=>.6*Math.cos(2*Math.PI*x/n)+.25*Math.sin(6*Math.PI*x/n))
  const product = signal.map((v,k)=>v*basis[k])
  const response = product.reduce((s,v)=>s+v,0)/n
  const isWave = fig === 'frequency-wave'
  return <figure className="vi-intro-figure vi-construction-figure">
    <div className="vi-instrument-label">{tr('频率分析仪 · 独立示例', 'Frequency analyser · independent example')}</div>
    <Show scene="figure" label={isWave ? tr('波形样本','Wave samples') : tr('观测读数','Observed readings')} value={fromRows([isWave ? basis : signal])}/>
    <div className="vi-figure-controls">
      <button type="button" aria-pressed={frequency===1} onClick={()=>setFrequency(frequency===1?3:1)}>{tr('周期数','Cycles')} {frequency}</button>
      <button type="button" aria-pressed={phase!==0} onClick={()=>setPhase(phase===0?.25:0)}>{tr('相位（周）','Phase (turns)')} {phase}</button>
    </div>
    {!isWave && <><Show scene="figure" label={tr('逐格乘积','Sample products')} value={fromRows([product])}/><div className="vi-computed-reading"><span>{tr('逐格乘积的平均','Mean sample product')}</span><strong>{fmt(response)}</strong></div></>}
    <figcaption><Rich text={isWave ? tr('改变周期数与改变相位会产生不同的变化。数值表保留负值，底色仅用于辅助观察。<wiki-ref to="wave-parameters"></wiki-ref>','Frequency and phase change different properties. The numeric table retains negative readings; cell colours are visual aids. <wiki-ref to="wave-parameters"></wiki-ref>') : tr('探针先与观测逐位置相乘，再汇总。改变相位可能让一个探针失去响应，因此需要两条正交测量。<wiki-ref to="frequency-projection"></wiki-ref>','Multiply the observation and probe at matching positions, then reduce. Phase can silence one probe, motivating two orthogonal measurements. <wiki-ref to="frequency-projection"></wiki-ref>')}/></figcaption>
    {fig==='frequency-table' && <p>{tr('展开遍历：同一行重复 N 次，每次使用不同索引 k。重复的是工作，不是新增信息。','Expansion repeats one source row N times with different indices k. It repeats work without creating information.')}</p>}
  </figure>
}
function WindowDemo() {
  const [at,setAt]=useState({x:1,y:1})
  const image=[[.1,.4,.6,.2],[.8,.3,.5,.9],[.2,.7,.1,.4]]
  const weights=[[0,.1,0],[.2,.4,.2],[0,.1,0]]
  const cells=weights.flatMap((row,j)=>row.map((w,i)=>{
    const x=at.x+i-1,y=at.y+j-1,outside=x<0||x>=4||y<0||y>=3
    return {w,v:outside?0:image[y][x],outside}
  }))
  return <figure className="vi-intro-figure vi-construction-figure">
    <Show scene="figure" value={fromRows(image)} label={tr('点击选择一个输出位置','Select an output location')} mark={at} onPick={(x,y)=>setAt({x,y})}/>
    <div className="vi-window-products">{cells.map(({v,w,outside},k)=><div key={k}><span>{outside?tr('图外 0','Outside 0'):fmt(v)} × {w}</span><strong>{fmt(v*w)}</strong></div>)}</div>
    <div className="vi-computed-reading"><span>{tr(`位置 (${at.x},${at.y}) 的加权和`,`Weighted sum at (${at.x},${at.y})`)}</span><strong>{fmt(cells.reduce((s,p)=>s+p.v*p.w,0))}</strong></div>
    <figcaption><Rich text={tr('这九项在展开表中占一行；每行对应一个输出位置。读数、权重逐列对应，工具不替你组合它们。图外假设为 0。<wiki-ref to="local-kernel"></wiki-ref>','These nine samples occupy one unfolded row per output location, matched to weight columns. The helper does not combine them. Outside is zero. <wiki-ref to="local-kernel"></wiki-ref>')}/></figcaption>
  </figure>
}
export default function ConstructionFigure({ fig }) {
  const [changed,setChanged] = useState(false)
  const [location,setLocation] = useState(2)
  if (fig==='window-table') return <WindowDemo/>
  if (fig.startsWith('frequency-') && fig!=='frequency-filter') return <WaveDemo fig={fig}/>
  if (fig==='frequency-filter') {
    const source = Array.from({length:16},(_,x)=>.5+.25*Math.cos(2*Math.PI*x/16)+.12*Math.sin(6*Math.PI*x/16))
    const filtered = Array.from({length:16},(_,x)=>.5+.25*Math.cos(2*Math.PI*x/16))
    return <figure className="vi-intro-figure vi-construction-figure"><div className="vi-instrument-label">{tr('同一信号，选择不同频率贡献','One signal, different frequency contributions')}</div><Show scene="figure" label={tr('数值读数','Numeric readings')} value={fromRows([source])}/><Show scene="figure" label={tr('数值读数','Numeric readings')} value={fromRows([changed?filtered:source])}/><button type="button" className="vi-primer-switch" onClick={()=>setChanged(!changed)}>{changed?tr('保留全部频率','Retain all frequencies'):tr('抑制三周期分量','Suppress the three-cycle component')}</button><figcaption><Rich text={tr('两条正交分量一起缩放才能保留相位关系。已知频率的抑制不等于自动判断哪些细节是噪声。<wiki-ref to="frequency-filtering"></wiki-ref>','Scale both quadrature components together to retain phase. Suppressing known frequencies does not automatically identify nuisance details. <wiki-ref to="frequency-filtering"></wiki-ref>')}/></figcaption></figure>
  }
  if (fig==='inspection') return <figure className="vi-intro-figure vi-construction-figure"><Apparatus/><figcaption>{tr('把每次造出的部件装入下一台视觉机器。','Build parts, then reuse them in the next visual machine.')}</figcaption></figure>
  if (fig==='inspection-samples') {
    const reference=[[.7,.7,.7],[.7,.25,.7],[.7,.7,.7]]
    const observed=reference.map(r=>[...r]);if(changed)observed[0][1]=.2
    return <figure className="vi-intro-figure vi-construction-figure"><div className="vi-figure-pair"><Show scene="figure" value={fromRows(reference)} label={tr('合格参照','Reference')}/><Show scene="figure" value={fromRows(observed)} label={tr('观测','Observation')}/></div><button type="button" className="vi-primer-switch" onClick={()=>setChanged(!changed)}>{tr('更换待检工件','Change inspected item')}</button><figcaption>{tr('这里是独立示例。点击格子可看坐标与读数；真正的任务使用其他图像。','Independent example: select a cell to inspect its position and reading. Tasks use different images.')}</figcaption></figure>
  }
  if (fig==='separable') return <figure className="vi-intro-figure vi-construction-figure"><div className="vi-instrument-label">{tr('两次一维处理怎样形成二维贡献','How two 1D passes form 2D contributions')}</div><Show scene="figure" value={fromRows([[.04,.12,.04],[.12,.36,.12],[.04,.12,.04]])} label={tr('两组 [0.2,0.6,0.2] 的外积','Outer product of two [0.2,0.6,0.2] vectors')}/><div className="vi-computed-reading"><span>{tr('每个输出的加权取样次数','Weighted samples per output')}</span><strong>9 → 3 + 3</strong></div><figcaption><Rich text={tr('角上的贡献来自两条轴先后参与。只有可分解的核才有这种等价性；必须保持边界与输出域一致。<wiki-ref to="filter-separability"></wiki-ref>','Corners receive contributions from consecutive axis passes. Only factorable kernels have this equivalence, with matched boundaries and output domains. <wiki-ref to="filter-separability"></wiki-ref>')}/></figcaption></figure>
  const samples=[.2,.4,.7,.5,.1],weights=[.2,.6,.2]
  const input=changed?samples.map(v=>1-v):samples
  const read=(x)=>input[Math.max(0,Math.min(input.length-1,x))]
  const contributions=weights.map((w,k)=>({v:read(location+k-1),w}))
  if(fig==='directional-change')return <figure className="vi-intro-figure vi-construction-figure"><Show scene="figure" label={tr('数值读数','Numeric readings')} value={fromRows([input])}/><div className="vi-computed-reading"><span>{tr('示例：右邻减左邻','Example: right minus left')}</span><strong>{fmt(read(location+1)-read(location-1))}</strong></div><button type="button" className="vi-primer-switch" onClick={()=>setChanged(!changed)}>{tr('反转明暗','Reverse contrast')}</button><figcaption><Rich text={tr('反转明暗会改变响应符号，而不是让分界位置消失。<wiki-ref to="gradient-components"></wiki-ref>','Contrast reversal changes the response sign, not the transition location. <wiki-ref to="gradient-components"></wiki-ref>')}/></figcaption></figure>
  return <figure className="vi-intro-figure vi-construction-figure"><div className="vi-instrument-label">{tr('移动取样窗口 · 独立示例','Moving sample window · independent example')}</div><Show scene="figure" value={fromRows([input])} label={tr('原始读数','Source readings')} mark={{x:location,y:0}}/>
    <div className="vi-contributions">{contributions.map(({v,w},k)=><span key={k}>{fmt(v)} × {w}<strong>{fmt(v*w)}</strong></span>)}</div>
    <div className="vi-computed-reading"><span>{tr('加权和','Weighted sum')}</span><strong>{fmt(contributions.reduce((s,{v,w})=>s+v*w,0))}</strong></div>
    <button type="button" className="vi-primer-switch" onClick={()=>setLocation(location===3?1:location+1)}>{tr('移动窗口','Move window')}</button>
    <figcaption><Rich text={fig==='window-table'?tr('展开表让每个输出位置成为一行，读数和书写权重逐列对应；汇总后再还原位置。<wiki-ref to="local-kernel"></wiki-ref>','The unfolded table assigns one row per output position, with matching sample and weight columns. Restore positions after reduction. <wiki-ref to="local-kernel"></wiki-ref>'):tr('位置决定读取哪个邻居，权重决定其贡献。此示例由系统展示计算，不是需要填写的题。<wiki-ref to="weighted-neighbourhood"></wiki-ref>','Position chooses the neighbour; weight chooses its contribution. This computed example is explanatory, not a numeric-fill task. <wiki-ref to="weighted-neighbourhood"></wiki-ref>')}/></figcaption>
  </figure>
}
