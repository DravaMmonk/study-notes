import { placement, srcNode } from './model.js'
import { dependencyOrder } from './layout.js'

export const BLOCK_VIEWS = ['full', 'ports', 'hidden']
const editable = (board, parts) => board.nodes.filter((n) => !n.in && parts.role(n) === 'part')

export function blocksOf(board, parts) {
  const valid = new Set(editable(board, parts).map((n) => n.id)), used = new Set(), ids = new Set()
  return (board.blocks ?? []).flatMap((block) => {
    if (!block.id || ids.has(block.id)) return []
    ids.add(block.id)
    const nodes = (block.nodes ?? []).filter((id) => valid.has(id) && !used.has(id) && (used.add(id), true))
    if (!nodes.length) return []
    const within = new Set(nodes)
    return [{id:block.id,note:block.note ?? '',view:BLOCK_VIEWS.includes(block.view)?block.view:'ports',nodes,
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
  const ordered = dependencyOrder(roots,board.wires).map((n)=>n.id), cells = new Map()
  let cursor=0
  for(const unit of dependencyOrder(units,links)) {
    const grouped=unit.id.startsWith('block:')
    if(grouped&&cursor%placed.cols)cursor+=placed.cols-cursor%placed.cols
    const occupied=new Set()
    for(const id of [...unit.nodes].sort((a,b)=>ordered.indexOf(a)-ordered.indexOf(b))) {
      const [w,h]=placed.span.get(id), covering=(at)=>Array.from({length:w*h},(_,k)=>at+Math.floor(k/w)*placed.cols+k%w)
      let at=0
      while(at%placed.cols+w>placed.cols||covering(at).some(i=>occupied.has(i)))at++
      covering(at).forEach(i=>occupied.add(i));cells.set(id,cursor+at)
    }
    cursor+=grouped?Math.ceil((Math.max(...occupied)+1)/placed.cols)*placed.cols:Math.max(...occupied)+1
  }
  return {...board,nodes:board.nodes.map(n=>cells.has(n.id)?{...n,slot:cells.get(n.id)}:n)}
}

export function blockPreset(board, stages, parts) {
  if (board.blocks !== undefined) return board
  const blocks = stages.map((s)=>({id:`course:${s.id}`,note:s.label,view:'ports',nodes:s.nodes}))
  return blockSlots({...board,blocks},parts)
}

export function editBlock(board, parts, id, patch) {
  const all = blocksOf(board,parts).map(({ins:_ins,outs:_outs,...b})=>b)
  if(patch===null)return {...board,blocks:all.filter(b=>b.id!==id)}
  const old=all.find(b=>b.id===id)
  const nodes=patch.nodes??old?.nodes??[]
  const next={...old,id,note:old?.note??'',view:old?.view??'ports',...patch,nodes}
  const stolen=new Set(nodes)
  const remaining=all.filter(b=>b.id!==id).map(b=>({...b,nodes:b.nodes.filter(n=>!stolen.has(n))})).filter(b=>b.nodes.length)
  const result={...board,blocks:[...remaining,next]}
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
  return blocksOf(board,parts).map(b=>({...b,start:Math.min(...b.nodes.map(id=>Math.floor(placed.cell.get(id)/placed.cols))),end:Math.max(...b.nodes.map(id=>Math.floor(placed.cell.get(id)/placed.cols)+(placed.span.get(id)?.[1]??1)))}))
}
