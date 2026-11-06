import { useState } from 'react'
import { EyeOff, LayoutGrid, Waypoints, X } from 'lucide-react'
import { L } from '../shell/i18n.js'
import { WORDS } from '../shell/words.js'

const VIEWS = [['full',LayoutGrid,WORDS.blockFull],['ports',Waypoints,WORDS.blockPorts],['hidden',EyeOff,WORDS.blockHidden]]

// The same header belongs to desktop backdrops, phone backdrops and phone boundary rules.
export default function BlockHeader({ block, editable = true, onEdit }) {
  const [draft,setDraft]=useState(null)
  const commit=()=>{if(draft!==null){onEdit({note:draft});setDraft(null)}}
  return <div className="block-header" onPointerDown={(e)=>e.stopPropagation()}>
    {draft!==null ? <input autoFocus aria-label={L(WORDS.blockNote)} value={draft} onChange={(e)=>setDraft(e.target.value)} onBlur={commit} onKeyDown={(e)=>{if(e.key==='Enter')commit();if(e.key==='Escape')setDraft(null)}} /> : editable ? <button className="block-note" type="button" aria-label={L(WORDS.blockNote)} onClick={()=>setDraft(L(block.note)||'')}>{L(block.note)||L(WORDS.block)}</button> : <span className="block-note">{L(block.note)||L(WORDS.block)}</span>}
    <small>{L(WORDS.blockCount(block.nodes.length))}</small>
    <span className="block-views" role="group">{VIEWS.map(([view,Icon,label])=><button key={view} type="button" title={L(label)} aria-label={L(label)} aria-pressed={block.view===view} onClick={()=>onEdit({view})}><Icon size={13} /></button>)}</span>
    {editable&&<button className="block-delete" type="button" title={L(WORDS.deleteBlock)} aria-label={L(WORDS.deleteBlock)} onClick={()=>onEdit(null)}><X size={13} /></button>}
  </div>
}
