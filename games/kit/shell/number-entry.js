// Numeric drafts are text until the user explicitly commits a finite value.
const DECIMAL = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i
export function numberValue(text) {
  const parts = String(text).trim().split('/').map((p) => p.trim())
  if (parts.length > 2 || parts.some((p) => !DECIMAL.test(p))) return null
  const [a,b] = parts.map(Number)
  const value = parts.length === 2 ? b === 0 ? NaN : a / b : a
  return Number.isFinite(value) ? value : null
}
export function numberKey(state, key) {
  const text = state.text
  if (key === 'clear') return { text: '', replace: false }
  if (key === 'erase') return { text: state.replace ? '' : text.slice(0,-1), replace: false }
  if (key === 'sign') {
    if (/e[+-]?$/i.test(text)) return { text: text.endsWith('-') ? text.slice(0,-1) : text.replace(/\+?$/,'-'), replace: false }
    return { text: text.startsWith('-') ? text.slice(1) : '-'+text, replace: false }
  }
  if (key === '/' && (text.includes('/') || numberValue(text) === null)) return state
  if (key === 'e' && (text.includes('/') || /e/i.test(text) || numberValue(text) === null)) return state
  if (key === '.' && !state.replace && /\./.test(text.split(/[e/]/i).pop())) return state
  return { text: state.replace && /^[\d.]$/.test(key) ? key === '.' ? '0.' : key : text+key, replace: false }
}
