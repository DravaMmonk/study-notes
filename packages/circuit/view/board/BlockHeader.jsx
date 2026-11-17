import { useState } from 'react'
import { Sheet } from 'kernel/view'

import { PHONE, useMedia } from 'kernel/view'

import { EyeOff, GripVertical, LayoutGrid, Waypoints, X } from 'lucide-react'
import { L, tr } from 'kernel/view'

import { WORDS } from 'kernel/view'


const VIEWS = [['full',LayoutGrid,WORDS.blockFull],['ports',Waypoints,WORDS.blockPorts],['hidden',EyeOff,WORDS.blockHidden]]

// The same header belongs to desktop backdrops and phone boundary rules.
export default function BlockHeader({ block, editable = true, onEdit, onDragStart }) {
  const [draft,setDraft]=useState(null)
  const phone=useMedia(PHONE)
  const note = L(block.note) || L(WORDS.block)
  const commit=()=>{if(draft!==null){onEdit({note:draft});setDraft(null)}}
  return <><div className="block-header" onPointerDown={(e)=>e.stopPropagation()}>
    {onDragStart && <button type="button" className="block-move" title={L(WORDS.moveBlock)} aria-label={L(WORDS.moveBlock)} onPointerDown={onDragStart}><GripVertical size={13} /></button>}
    {draft!==null && !phone ? <input autoFocus aria-label={L(WORDS.blockNote)} value={draft} onChange={(e)=>setDraft(e.target.value)} onBlur={commit} onKeyDown={(e)=>{if(e.key==='Enter')commit();if(e.key==='Escape')setDraft(null)}} /> : editable ? <button className="block-note" type="button" aria-label={L(WORDS.blockNote)} title={note} onClick={()=>setDraft(L(block.note)||'')}>{note}</button> : <span className="block-note" title={note}>{note}</span>}
    <small>{L(WORDS.blockCount(block.nodes.length))}</small>
    <span className="block-views" role="group">{VIEWS.map(([view,Icon,label])=><button key={view} type="button" title={L(label)} aria-label={L(label)} aria-pressed={block.view===view} onClick={()=>onEdit({view})}><Icon size={13} /></button>)}</span>
    {editable&&<button className="block-delete" type="button" title={L(WORDS.deleteBlock)} aria-label={L(WORDS.deleteBlock)} onClick={()=>onEdit(null)}><X size={13} /></button>}
  </div>
    {phone && draft!==null && <Sheet title={L(WORDS.blockNote)} onClose={()=>setDraft(null)}>
      <form className="block-rename" onSubmit={e=>{e.preventDefault();commit()}}>
        <input aria-label={L(WORDS.blockNote)} value={draft} onChange={e=>setDraft(e.target.value)} />
        <button type="submit">{tr('保存')}</button>
      </form>
    </Sheet>}
  </>
}
