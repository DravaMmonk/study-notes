import { useState } from 'react'
import { Check, CircleAlert } from 'lucide-react'
import { L, tr } from '../../../shell/i18n.js'
import { differs, isImage, pixel, show } from '../image.js'
import ImageInspector from './ImageInspector.jsx'
import { AXIS, inspectorCell, inspectorWidth } from './image-layout.js'

const sampleText = (value) => Array.isArray(value) ? value.map((v,k)=>`${'RGB'[k]} ${v}`).join(' · ') : String(value)
const matchingShape = (a,b) => isImage(a) && isImage(b) && a.w===b.w && a.h===b.h && a.c===b.c
const delta = (a,b) => Array.isArray(a) ? a.map((v,k)=>b[k]-v) : b-a
const valueWidth = (value) => isImage(value) ? inspectorWidth(value) : Math.max(72,show(value).length*8+8)
const changed = (a,b,tolerance) => Array.isArray(a) ? a.some((v,k)=>Math.abs(v-b[k])>tolerance) : Math.abs(a-b)>tolerance

/** Output selection and pixel comparison keep evidence in view without repeating entire test tables. */
export default function MobileResults({ rows, given, tolerance }) {
  const [selected,setSelected] = useState(0)
  const outputs=rows.slice(given)
  const inputs=rows.slice(0,given)
  const pictures=inputs.filter(([,v])=>isImage(v))
  const parameters=inputs.filter(([,v])=>!isImage(v)).map(([name,v])=>`${L(name)} ${show(v)}`).join(' · ')
  const index=Math.min(selected,outputs.length-1)
  const [label,want,got]=outputs[index]
  const paired=matchingShape(want,got)
  const scalarOnly=outputs.every(([,target,result])=>!isImage(target)&&!isImage(result))
  const inspectPixel=paired ? (x,y)=>{
    const a=pixel(want,x,y),b=pixel(got,x,y)
    return <><span>{tr('目标','Target')} {sampleText(a)}</span><span>{tr('当前','Current')} {sampleText(b)}</span><span>{tr('差值','Difference')} {sampleText(delta(a,b))}</span></>
  } : undefined
  return <div className="vi-mobile-results">
    {scalarOnly ? <table className="vi-scalar-results">
      <thead><tr><th/><th>{tr('当前','Current')}</th><th>{tr('目标','Target')}</th></tr></thead>
      <tbody>{outputs.map(([name,target,result],k)=><tr key={k} data-different={result!==undefined&&Boolean(differs(target,result,tolerance))||undefined}>
        <th scope="row">{L(name)}</th><td>{result===undefined?'—':show(result)}</td><td>{show(target)}</td>
      </tr>)}</tbody>
    </table> : <>{outputs.length>1 ? <div className="vi-output-tabs" role="tablist" aria-label={tr('输出','Outputs')}>
      {outputs.map(([name,target,result],k)=>{
        const checked=result!==undefined
        const wrong=checked&&Boolean(differs(target,result,tolerance))
        return <button type="button" role="tab" aria-selected={index===k} aria-controls="vi-result-panel" id={`vi-output-tab-${k}`} data-different={wrong||undefined} key={k} tabIndex={index===k?0:-1} onClick={()=>setSelected(k)} onKeyDown={(e)=>{
          const next=e.key==='ArrowRight'?(k+1)%outputs.length:e.key==='ArrowLeft'?(k+outputs.length-1)%outputs.length:e.key==='Home'?0:e.key==='End'?outputs.length-1:null
          if(next===null)return
          e.preventDefault();setSelected(next);e.currentTarget.parentElement.children[next].focus()
        }}>
          <span>{L(name)}</span>{checked&&(wrong?<CircleAlert size={14} aria-label={tr('有差异','Different')}/>:<Check size={14} aria-label={tr('一致','Matches')}/>)}
        </button>
      })}
    </div> : <h3 className="vi-result-title">{L(label)}</h3>}
    <section id="vi-result-panel" role={outputs.length>1?'tabpanel':undefined} aria-labelledby={outputs.length>1?`vi-output-tab-${index}`:undefined}>
      <div className="vi-result-pair">
        {[got,want].map((value,k)=>{
          const name=k===0?tr('当前','Current'):tr('目标','Target')
          const width=valueWidth(value===undefined?want:value)
          return <div key={`${index}-${k}`} className="vi-result-value" style={{width:`min(100%, ${width}px)`}}>
            <div className="vi-result-label"><strong>{name}</strong>{isImage(value)&&(!paired||k===1)&&<small>{value.w} × {value.h}{value.c===3?' · RGB':''}</small>}</div>
            {value===undefined?<div className="vi-empty-value" style={{height:isImage(want)?Math.min(176,AXIS+want.h*inspectorCell(want)+2):28}}>{tr('暂无结果','No result yet')}</div>
              :isImage(value)?<ImageInspector value={value} label={name} caption={false}
                cellClass={paired?(x,y)=>changed(pixel(want,x,y),pixel(got,x,y),tolerance)?'is-different':'':undefined} inspectPixel={inspectPixel}/>
              :<strong className="vi-value">{show(value)}</strong>}
          </div>
        })}
      </div>
    </section></>}
    {pictures.length>0?<details className="vi-result-inputs">
      <summary>{tr('输入','Inputs')}<small>{parameters}</small></summary>
      <div className="vi-result-given">{pictures.map(([name,v],k)=><ImageInspector key={k} value={v} label={L(name)}/>)}</div>
    </details>:<div className="vi-input-summary"><span>{tr('输入','Inputs')}</span><small>{parameters}</small></div>}
  </div>
}
