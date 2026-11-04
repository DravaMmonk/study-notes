export const imageNumber = (value) => Number.isFinite(value) ? String(Number(value.toFixed(2))) : String(value)

export const AXIS = 18
export const inspectorCell = (image) => image.c===3 ? 56 : image.data.reduce((width,value)=>Math.max(width,Math.min(64,8+imageNumber(value).length*7)),36)
export const inspectorWidth = (image) => AXIS+image.w*inspectorCell(image)+2
