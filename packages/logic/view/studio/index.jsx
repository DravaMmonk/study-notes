import SymbolEditor from './SymbolEditor.jsx'

/** Register symbol authoring and navigation with the generic Studio shell. */
export function registerEditors(kernel) {
  kernel.editor('logic:symbol', { type: 'logic/symbol', component: SymbolEditor,
    listKey: 'symbols', name: ['符号', 'Symbols'], groupings: ['tag', 'circuit/tray', 'relation'] })
}
