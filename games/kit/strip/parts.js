import { editorOf, markOf } from '../engine/parts.js'

/** Registered strip parts by their content IDs. */
export function stripParts(file) {
  return Object.fromEntries(Object.entries(file?.parts ?? {}).filter(([, part]) => editorOf(part) === 'strip')
    .map(([type, part]) => [type, { ...part, type, mark: markOf(part) }]))
}
