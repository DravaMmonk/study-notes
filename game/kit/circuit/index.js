// The circuit editor shared by every game (React): the desktop board (CanvasEditor) and the phone board (SlotBoard,
// useSlotEditing, Tray, Notice), on one circuit model (model.js). A game brings its parts, what a card shows and its
// own sheets; the editing, the keys and the gestures are the same everywhere.
export * from './model.js'
export * from './sensors.js'
export { default as CanvasEditor } from './CanvasEditor.jsx'
export { default as SlotBoard, drawWires } from './SlotBoard.jsx'
export { NUMBERS, useSlotEditing } from './useSlotEditing.js'
export { default as Tray } from './Tray.jsx'
export { default as Notice } from './Notice.jsx'
export { default as Palette } from './Palette.jsx'
export { default as FloatWindow } from './FloatWindow.jsx'
export { default as DemoBench } from './DemoBench.jsx'
