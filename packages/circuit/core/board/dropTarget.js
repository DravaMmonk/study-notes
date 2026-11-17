// Frames and identity blocks share pointer containment, regardless of backdrop pointer-events or moving cards.
export function containerUnderPointer(layer, drag, selector) {
  return [...layer.querySelectorAll(selector)].reverse().find(el=>{
    if(el.closest('.board-layer')!==layer||drag.el.contains(el))return false
    const box=el.getBoundingClientRect()
    return box.width>0&&box.height>0&&drag.x>=box.left&&drag.x<=box.right&&drag.y>=box.top&&drag.y<=box.bottom
  })??null
}
