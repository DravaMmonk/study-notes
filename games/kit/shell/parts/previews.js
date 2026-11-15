// Each editor draws its own pieces (games/DESIGN.md 6.8): preview(piece, { game, scene }) gives what a piece looks
// like in a scene, `card` (the desktop), `tile` (the phone) or `detail` (shared), or null where the editor draws
// none; its Sheet is the piece's fields no scene draws. Studio's piece page, the parts box and a built piece's detail
// lay out what the piece's editor gives, by the editor the piece names.
import { editorOf } from '../../engine/pieces.js'
import circuit from '../../circuit/preview.jsx'

export const EDITORS = { circuit }
export const SCENES = ['card', 'tile', 'detail']

/** The editor drawing `piece` (pieces.json's entry with its `type`). */
export const editorFor = (piece) => EDITORS[editorOf(piece)]
