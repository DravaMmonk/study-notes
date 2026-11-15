import { S } from './schema.js'

const label = S.obj({ zh: S.str(), en: S.str() })

// A board is either the work being edited or a simulation shown next to its circuit.
export const BOARD_PLAY = S.obj({
  editor: S.oneOf(['board']),
  judge: S.oneOf(['hand', 'robot']),
  resources: S.str(),
  label,
  layout: S.obj({
    board: S.oneOf(['stage', 'results']),
    boardLabel: label,
    cardClass: S.str(),
    noteClass: S.str(),
    afterClass: S.str(),
    phoneClass: S.str(),
    desktopClass: S.str(),
    panelClass: S.opt(S.str()),
  }),
})
