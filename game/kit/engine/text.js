// Every piece of text a player reads is a { zh, en } pair with a real English side (../shell/i18n.js). A Chinese
// string outside a pair has no English. Circuits (solution, naive, alsoFails…) hold no text and are skipped, and so
// are functions (computed text is checked where it is written).
import { isPair } from '../shell/i18n.js'

const HAN = /\p{Script=Han}/u
const SKIP = new Set(['solution', 'naive', 'alsoFails'])

/** Problems with the text inside `value`, each as '<path> …'. */
export function untranslated(value, path, out = [], visited = new Set()) {
  if (typeof value === 'string') {
    if (HAN.test(value)) out.push(`${path} has no English: ${value.slice(0, 40)}`)
    return out
  }
  if (!value || typeof value !== 'object' || visited.has(value) || ArrayBuffer.isView(value)) return out
  visited.add(value)
  if (isPair(value)) {
    if (typeof value.en !== 'string' || !value.en.trim()) out.push(`${path} has an empty English side: ${String(value.zh).slice(0, 40)}`)
    else if (HAN.test(value.en)) out.push(`${path} has Chinese in its English side: ${value.en.slice(0, 40)}`)
    return out
  }
  for (const [key, inner] of Object.entries(value)) if (!SKIP.has(key)) untranslated(inner, `${path}.${key}`, out, visited)
  return out
}
