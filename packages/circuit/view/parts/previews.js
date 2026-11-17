// Each editor draws its own parts (games/DESIGN.md 6.8): preview(part, { game, scene }) gives what a part looks
// like in a scene, `card` (the desktop), `tile` (the phone) or `detail` (shared), or null where the editor draws
// none; its Sheet is the part's fields no scene draws. Studio's part page, the parts box and a built part's detail
// lay out what the part's editor gives, by the editor the part names.
import circuit from "../board/preview.jsx"

export const EDITORS = { circuit }
export const SCENES = ['card', 'tile', 'detail']

/** The editor drawing `part` (parts.json's entry with its `type`). */
export const editorFor = (part) => circuit
