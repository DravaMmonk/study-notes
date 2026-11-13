// A piece's faces are independent. The persisted circuit definitions use the established inputs and views keys.
export const holesOf = (piece) => piece.inputs ?? []
export const outletsOf = (piece) => piece.outputs ?? []
export const settingsOf = (piece) => piece.settings ?? []
export const regionsOf = (piece) => piece.regions ?? []
export const insideOf = (piece) => piece.inside ?? null
export const facesOf = (piece) => piece.views ?? {}
export const keepsOf = (piece) => piece.keeps ?? []

/** Register named pieces from code and from a game's content. The content supplies the definition of a shared name. */
export function registerPieces(code, content) {
  return { ...code, ...content }
}
