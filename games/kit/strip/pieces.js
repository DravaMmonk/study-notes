import { editorOf, markOf } from '../engine/pieces.js'

/** Registered strip pieces by their content IDs. */
export function stripPieces(file) {
  return Object.fromEntries(Object.entries(file?.parts ?? {}).filter(([, piece]) => editorOf(piece) === 'strip')
    .map(([type, piece]) => [type, { ...piece, type, mark: markOf(piece) }]))
}
