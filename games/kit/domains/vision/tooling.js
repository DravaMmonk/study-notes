// Content conversion and saved-node migration are explicit; the curriculum uses one arithmetic component.
export const arithmeticBlueprint = (lines) => lines?.map((line)=>line.replace(/(=\s*)(add|sub|mul|div)(?=\s*\()/g,(_match,start,op)=>`${start}arithmetic[op=${op}]`))
export const introducedParts = (level) => [...new Set([...(level.adds??[]),...(level.tasks??[]).flatMap((t)=>t.adds??[])])]

/** Restore only tools and settings available at the task's point in the course. */
export function taskBoard(board, held, outside) {
  if(!board?.nodes)return board
  const nodes=board.nodes.filter((n)=>['in','out'].includes(n.type)||held.has(n.type)).map((n)=>n.params?.outside&&!outside.includes(n.params.outside)?{...n,params:{...n.params,outside:'zero'}}:n)
  const ids=new Set(nodes.map((n)=>n.id))
  return {...board,nodes,wires:board.wires.filter((w)=>ids.has(w.from.split('#')[0])&&ids.has(w.to))}
}
