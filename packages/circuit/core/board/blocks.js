import { srcNode } from "../wire-source.js"
import { cardWidth } from "./card-size.js"
import { byId, fitsSlotEdit, placement, spotIn } from "./model.js"
import { moveInto } from "./frames.js"
import { frameId, frameTree, regionsOf } from "./regions.js"
import { slotGrid } from "./slot-grid.js"
import { layoutOrder, pipelineLayout } from "./layout.js"

export const BLOCK_VIEWS = ['full', 'ports', 'hidden']
const editable = (board, parts) => board.nodes.filter((n) => !n.in && parts.role(n) === 'part')

export function blocksOf(board, parts) {
  const valid = new Set(editable(board, parts).map((n) => n.id)), used = new Set(), ids = new Set()
  const tree = frameTree(board.nodes)
  return (board.blocks ?? []).flatMap((block) => {
    if (!block.id || ids.has(block.id)) return []
    ids.add(block.id)
    const nodes = (block.nodes ?? []).filter((id) => valid.has(id) && !used.has(id) && (used.add(id), true))
    if (!nodes.length) return []
    const within = tree.included(nodes)
    return [{id:block.id,note:block.note ?? '',view:BLOCK_VIEWS.includes(block.view)?block.view:'ports',nodes,...(['full','ports'].includes(block.lastView)?{lastView:block.lastView}:{}),
      ...(Number.isInteger(block.slot)&&block.slot>=0?{slot:block.slot}:{}),
      ...(Number.isInteger(block.rows)&&block.rows>0?{rows:block.rows}:{}),
      ins:board.wires.filter((w)=>within.has(w.to)&&!within.has(srcNode(w.from))),
      outs:board.wires.filter((w)=>within.has(srcNode(w.from))&&!within.has(w.to)),
    }]
  })
}

/** A unit's phone members occupy contiguous rows; ungrouped parts remain independently editable. */
export function blockSlots(board, parts) {
  const placed = placement(board, parts), blocks = blocksOf(board, parts), roots = editable(board, parts)
  const owner = new Map(blocks.flatMap((b)=>b.nodes.map((id)=>[id,b.id])))
  const units = blocks.map((b)=>({id:`block:${b.id}`,nodes:b.nodes})).concat(roots.filter((n)=>!owner.has(n.id)).map((n)=>({id:n.id,nodes:[n.id]})))
  const unitOf = new Map(units.flatMap((u)=>u.nodes.map((id)=>[id,u.id])))
  const links = board.wires.flatMap((w)=>unitOf.has(srcNode(w.from))&&unitOf.has(w.to)&&unitOf.get(srcNode(w.from))!==unitOf.get(w.to)?[{from:unitOf.get(srcNode(w.from)),to:unitOf.get(w.to)}]:[])
  const ordered = layoutOrder(roots,board.wires).map((n)=>n.id), cells = new Map(), bounds = new Map()
  let cursor=0
  for(const unit of layoutOrder(units,links)) {
    const grouped=unit.id.startsWith('block:')
    if((grouped||unit.nodes.some(id=>placed.span.get(id).some(n=>n>1)))&&cursor%placed.cols)cursor+=placed.cols-cursor%placed.cols
    const start=cursor
    const grid = slotGrid(placed.cols)
    for (const id of [...unit.nodes].sort((a, b) => ordered.indexOf(a) - ordered.indexOf(b))) {
      const span = placed.span.get(id)
      const at = grid.firstFree(span)
      grid.take(at, span)
      cells.set(id, cursor + at)
    }
    const height = Math.ceil((grid.last + 1) / placed.cols) + 1
    if (grouped) bounds.set(unit.id.slice(6), { slot: start, rows: height })
    cursor += grouped ? height * placed.cols : grid.last + 1
  }
  return {...board,blocks:blocks.map(({ins:_ins,outs:_outs,...b})=>({...b,...bounds.get(b.id)})),nodes:board.nodes.map(n=>cells.has(n.id)?{...n,slot:cells.get(n.id)}:n)}
}

export function blockPreset(board, stages, parts) {
  if (board.blocks !== undefined) return board
  const blocks = stages.map((s)=>({id:`course:${s.id}`,note:s.label,view:'ports',nodes:s.nodes}))
  const slotted=blockSlots({...board,blocks},parts),ports=new Set(blocks.flatMap(b=>b.nodes))
  const opening=pipelineLayout(slotted,blocks,{roleOf:parts.role,sizeOf:n=>({w:cardWidth(parts,n),h:parts.role(n)!=='part'?150:ports.has(n.id)?Math.max(70,48+20*parts.inputs(n).length):230})})
  return {...slotted,nodes:slotted.nodes.map(n=>opening.nodes.has(n.id)?{...n,...opening.nodes.get(n.id)}:n)}
}

export function editBlock(board, parts, id, patch) {
  const all = blocksOf(board,parts).map(({ins:_ins,outs:_outs,...b})=>b)
  if(patch===null)return {...board,blocks:all.filter(b=>b.id!==id)}
  const old=all.find(b=>b.id===id)
  const nodes=patch.nodes??old?.nodes??[]
  const next={...old,id,note:old?.note??'',view:old?.view??'ports',...patch,nodes}
  if(patch.view==='hidden'&&old?.view!=='hidden')next.lastView=old?.view??'ports'
  const stolen=new Set(nodes)
  const remaining=all.filter(b=>b.id!==id).map(b=>({...b,nodes:b.nodes.filter(n=>!stolen.has(n))})).filter(b=>b.nodes.length)
  const ordered=old?all.map(b=>b.id===id?next:{...b,nodes:b.nodes.filter(n=>!stolen.has(n))}).filter(b=>b.nodes.length):[...remaining,next]
  const result={...board,blocks:ordered}
  result.blocks=blocksOf(result,parts).map(({ins:_ins,outs:_outs,...b})=>b)
  return patch.nodes ? blockSlots(result,parts) : result
}
export function createBlock(board,parts,nodes) {
  if(!nodes.length)return board
  let k=1
  while((board.blocks??[]).some(b=>b.id===`block${k}`))k++
  return editBlock(board,parts,`block${k}`,{nodes,view:'ports'})
}
export function rectangleMembers(board,parts,rect,positionOf,sizeOf) {
  const left=Math.min(rect[0][0],rect[1][0]),right=Math.max(rect[0][0],rect[1][0]),top=Math.min(rect[0][1],rect[1][1]),bottom=Math.max(rect[0][1],rect[1][1])
  return editable(board,parts).filter(n=>{const p=positionOf(n),size=sizeOf(n),x=p.x+size[0]/2,y=p.y+size[1]/2;return x>=left&&x<=right&&y>=top&&y<=bottom}).map(n=>n.id)
}
export function rowMembers(board,parts,start,end,placed=placement(board,parts)) {
  const low=Math.min(start,end),high=Math.max(start,end)
  return [...placed.cell].filter(([,slot])=>Math.floor(slot/placed.cols)>=low&&Math.floor(slot/placed.cols)<=high).map(([id])=>id)
}
export function blockRows(board,parts,placed=placement(board,parts)) {
  return blocksOf(board,parts).map(block=>{
    const start=Number.isInteger(block.slot)?Math.floor(block.slot/placed.cols):Math.min(...block.nodes.map(id=>Math.floor(placed.cell.get(id)/placed.cols)))
    const end=block.rows?start+block.rows:Math.max(...block.nodes.map(id=>Math.floor(placed.cell.get(id)/placed.cols)+(placed.span.get(id)?.[1]??1)))
    return {...block,start,end}
  })
}

/** Project containers with a trailing insertion row while retaining their member-relative holes. */
export function phoneBlockBoard(board,parts) {
  const blocks=blocksOf(board,parts)
  if(!blocks.length)return board
  const placed=placement(board,parts),owner=new Set(blocks.flatMap(b=>b.nodes)),slots=new Map(),bounds=new Map()
  const units=blocks.map(block=>({block,at:block.slot??Math.floor(Math.min(...block.nodes.map(id=>placed.cell.get(id)))/placed.cols)*placed.cols}))
    .concat(editable(board,parts).filter(n=>!owner.has(n.id)).map(node=>({node,at:placed.cell.get(node.id)})))
    .sort((a,b)=>a.at-b.at)
  const grid=slotGrid(placed.cols)
  let cursor=0
  for(const unit of units){
    const start=Math.max(cursor,unit.at)
    if(unit.block){
      const locals=unit.block.nodes.map(id=>[id,placed.cell.get(id)-unit.at])
      const rows=1+Math.max(...locals.map(([id,local])=>Math.floor(local/placed.cols)+placed.span.get(id)[1]))
      const span=[placed.cols,rows]
      const at=grid.firstFree(span,start)
      grid.take(at,span)
      for(const [id,local] of locals)slots.set(id,at+local)
      bounds.set(unit.block.id,{slot:at,rows})
      cursor=at+rows*placed.cols
    }else{
      const span=placed.span.get(unit.node.id)
      const at=grid.firstFree(span,start)
      grid.take(at,span)
      slots.set(unit.node.id,at)
    }
  }
  return {...board,blocks:blocks.map(({ins:_ins,outs:_outs,...b})=>({...b,...bounds.get(b.id)})),nodes:board.nodes.map(n=>slots.has(n.id)?{...n,slot:slots.get(n.id)}:n)}
}

export function blockAtSlot(board,parts,slot,region=null,placed) {
  if(region!==null)return null
  const layout=placed??placement(board,parts),row=Math.floor(slot/layout.cols)
  return blockRows(board,parts,layout).find(b=>row>=b.start&&row<b.end)?.id??null
}

export function blockOfPart(board,id) {
  const tree = frameTree(board.nodes)
  const ancestors = new Set([id, ...(tree.ancestors(tree.node(id)?.in) ?? []).map(frameId)])
  return (board.blocks??[]).find(b=>b.nodes.some(n=>ancestors.has(n)))?.id??null
}

/** Membership changes follow explicit drop containers, never enlarged component bounds. */
export function transferBlockMembers(board,parts,assignments) {
  const valid=new Set(editable(board,parts).map(n=>n.id)),moved=new Set(assignments.map(a=>a.id))
  return {...board,blocks:(board.blocks??[]).map(block=>({...block,nodes:[...block.nodes.filter(id=>!moved.has(id)),...assignments.filter(a=>a.block===block.id&&valid.has(a.id)).map(a=>a.id)]})).filter(b=>b.nodes.length)}
}

/** Newly carried parts use free, ungrouped rows without rewriting any existing slot. */
export function withNewSlots(board, parts) {
  const added = editable(board, parts).filter((node) => !Number.isInteger(node.slot) || node.slot < 0)
  if (!added.length) return board
  const newIds = new Set(added.map((node) => node.id))
  const base = { ...board, nodes: board.nodes.filter((node) => !newIds.has(node.id)) }
  const placed = placement(base, parts)
  const { span: spans } = placement(board, parts)
  const grid = slotGrid(placed.cols)
  for (const [id, at] of placed.cell) grid.take(at, placed.span.get(id))
  for (const { start, end } of blockRows(base, parts, placed)) grid.take(start * placed.cols, [placed.cols, end - start])
  const slots = new Map()
  for (const node of added) {
    const span = spans.get(node.id)
    const at = grid.firstFree(span)
    grid.take(at, span)
    slots.set(node.id, at)
  }
  return { ...board, nodes: board.nodes.map((node) => slots.has(node.id) ? { ...node, slot: slots.get(node.id) } : node) }
}

const setSlots = (board, slots) => ({ ...board, nodes: board.nodes.map((node) => slots.has(node.id) ? { ...node, slot: slots.get(node.id) } : node) })

/** Pin the dropped part to a vacant slot, moving only neighbours whose footprints overlap. */
export function placeInPhoneSlot(board, parts, id, slot, region, before, canMove = () => true) {
  if (!before.free.includes(slot)) return null
  const { cols } = before
  const node = byId(board, id)
  const neighbours = [...before.cell].filter(([key]) => key !== id).sort((a, b) => a[1] - b[1])
  let next = board
  if (regionsOf(parts, node).length) {
    const row = slotGrid(cols)
    for (const [key, at] of neighbours) row.take(at, before.span.get(key))
    const preferred = Number.isInteger(node.span) && node.span > 0 ? Math.min(cols, node.span) : cols
    let width = preferred
    while (width > 1 && !row.fits(slot, [width, 1])) width--
    if (width < preferred) next = { ...board, nodes: board.nodes.map((n) => n.id === id ? { ...n, span: width } : n) }
  }

  // Moving out of a frame can shrink its footprint in the destination grid.
  const { span } = placement(next, parts, region)
  const size = span.get(id)
  const anchor = slot - Math.max(0, slot % cols + size[0] - cols)
  const grid = slotGrid(cols)
  const slots = new Map([[id, anchor]])
  for (const [key, at] of neighbours) if (!canMove(key)) grid.take(at, span.get(key))
  if (!grid.fits(anchor, size)) return null
  grid.take(anchor, size)
  const displaced = []
  for (const [key, at] of neighbours) {
    if (!canMove(key)) slots.set(key, at)
    else if (!grid.fits(at, span.get(key))) displaced.push([key, at])
    else { grid.take(at, span.get(key)); slots.set(key, at) }
  }
  for (const [key, at] of displaced) {
    const target = grid.firstFree(span.get(key), at)
    grid.take(target, span.get(key))
    slots.set(key, target)
  }
  return setSlots(next, slots)
}

/** Move into an empty slot or swap within one grid before committing membership. */
export function movePhonePart(board, parts, id, slot, region = null, canMove = () => true) {
  const node = byId(board, id)
  if (!node || parts.role(node) !== 'part' || !canMove(id)) return null
  const sameRegion = (node.in ?? null) === region
  const placed = placement(board, parts, region)
  const other = [...placed.cell].find(([, at]) => at === slot)?.[0]
  if (other === id) return { graph: board }
  if (other ? !sameRegion || !canMove(other) : !placed.free.includes(slot)) return null

  const moved = sameRegion ? board : moveInto(board, parts, id, region, ...spotIn(board, region))
  if (!sameRegion && moved === board) return null
  let next
  if (other) {
    const slots = new Map(placed.cell).set(id, slot).set(other, placed.cell.get(id))
    next = setSlots(moved, slots)
    if (!fitsSlotEdit(placement(next, parts, region), slots)) return null
  } else {
    next = placeInPhoneSlot(moved, parts, id, slot, region, placed, canMove)
    if (!next) return null
  }

  if (board.blocks === undefined) return { graph: next, other }
  const membership = [{ id, block: blockAtSlot(board, parts, slot, region, placed) }]
  if (other) membership.push({ id: other, block: blockOfPart(board, id) })
  return { graph: transferBlockMembers(next, parts, membership), other }
}

/** Translate root members only; frame children already move with their parent in local coordinates. */
export function translateBlock(board,parts,id,dx,dy,positions=new Map()) {
  const members=new Set(blocksOf(board,parts).find(b=>b.id===id)?.nodes??[])
  if(!members.size||(!dx&&!dy))return board
  return {...board,nodes:board.nodes.map(n=>{
    if(!members.has(n.id))return n
    const p=positions.get(n.id)??n
    return {...n,x:(p.x??0)+dx,y:(p.y??0)+dy}
  })}
}

/** A desktop drop changes group membership once and reuses the phone's explicit regrouping layout. */
export function assignBlock(board,parts,id,block) {
  const node=board.nodes.find(n=>n.id===id)
  const destination=node&&!node.in&&parts.role(node)==='part'&&(board.blocks??[]).some(b=>b.id===block)?block:null
  const origin=(board.blocks??[]).find(b=>b.nodes.includes(id))?.id??null
  if(origin===destination)return board
  return blockSlots(transferBlockMembers(board,parts,[{id,block:destination}]),parts)
}
