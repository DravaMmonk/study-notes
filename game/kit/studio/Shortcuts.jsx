// The studio's keys, in one sheet (?): the same keys the palette lists beside its actions.
import { tr } from '../shell/i18n.js'

export const MOD = typeof navigator !== 'undefined' && /Mac|iP(hone|ad)/.test(navigator.platform) ? '⌘' : 'Ctrl'
export const KEYS = [
  [`${MOD}+K`, '命令面板：去任何地方、做任何事', 'Command palette: go anywhere, do anything'],
  [`${MOD}+Shift+F`, '在整款游戏里搜索、替换', 'Search and replace across the game'],
  [`${MOD}+Z`, '去掉最后一个待定操作（不在文字框里时）', 'Drop the last pending operation (outside a field)'],
  [`${MOD}+Shift+Z`, '把去掉的操作放回来', 'Put a dropped operation back'],
  [`${MOD}+Enter`, '载入参考解，从这一关试玩', 'Play this level with its reference loaded'],
  ['F8 / Shift+F8', '下一处 / 上一处检查结果，跳到它说的字段', 'Next / previous finding, at the field it is about'],
  ['Alt+1…6', '跳到这一关的第几段', 'Jump to a section of the level'],
  ['Alt+[ / Alt+]', '收起或打开左栏 / 右栏', 'Fold the left / right panel'],
  ['↑ ↓', '树上逐关走（Shift：一路选上）', 'Level to level in the tree (Shift: pick as you go)'],
  [`${MOD}+click · Shift+click`, '在树上选几关，批量修改', 'Pick several levels in the tree for a bulk edit'],
  ['Alt+↑ ↓', '列表里的一项上移、下移', 'Move a list item up or down'],
  ['Esc', '关上面板、取消移动', 'Close a panel, stop moving'],
  ['?', '这张表', 'This sheet'],
]

export default function Shortcuts({ onClose }) {
  return (
    <div className="palette-scrim" onPointerDown={(e) => { if (e.target === e.currentTarget) onClose() }} onKeyDown={(e) => e.key === 'Escape' && onClose()}>
      <div className="palette keys" role="dialog" aria-label={tr('快捷键', 'Keys')}>
        <table>
          <tbody>
            {KEYS.map(([keys, zh, en]) => <tr key={keys}><th><kbd>{keys}</kbd></th><td>{tr(zh, en)}</td></tr>)}
          </tbody>
        </table>
        <button type="button" className="kit-btn is-label" onClick={onClose} autoFocus>Esc</button>
      </div>
    </div>
  )
}
