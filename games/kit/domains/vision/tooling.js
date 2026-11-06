/** New, restored and imported nodes use the same task-scoped defaults: the part's own, held to what the task offers. */
export function taskDefaults(type, partOf, settingsIn) {
  const part=partOf(type)
  const params={...(part?.defaults ?? {})}
  for(const [key,supported] of Object.entries(part?.settings??{})){
    const allowed=settingsIn(type,key)??supported
    if(allowed.length&&!allowed.includes(params[key]))params[key]=allowed[0]
  }
  return params
}

/** Restore only tools and settings available at the task's point in the course. */
export function taskBoard(board, held, settingsIn, partOf) {
  if(!board?.nodes)return board
  const nodes=board.nodes.filter((n)=>['in','out'].includes(n.type)||held.has(n.type)).map((node)=>{
    const params={...taskDefaults(node.type,partOf,settingsIn),...node.params}
    for(const [key,value] of Object.entries(params)){
      const allowed=settingsIn(node.type,key)
      if(allowed?.length&&!allowed.includes(value))params[key]=allowed[0]
    }
    return {...node,params}
  })
  const ids=new Set(nodes.map((n)=>n.id))
  return {...board,nodes,wires:board.wires.filter((w)=>ids.has(w.from.split('#')[0])&&ids.has(w.to))}
}
