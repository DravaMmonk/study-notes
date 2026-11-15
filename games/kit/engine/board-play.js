import { S } from './schema.js'

const label = S.obj({ zh: S.str(), en: S.str() })

// A board whose targets and actions are supplied by a hand-play resource.
export const BOARD_PLAY = S.obj({
  editor: S.oneOf(['board']),
  judge: S.oneOf(['hand']),
  resources: S.str(),
  label,
  layout: S.obj({
    boardLabel: label,
    cardClass: S.str(),
    noteClass: S.str(),
    afterClass: S.str(),
    phoneClass: S.str(),
    desktopClass: S.str(),
    panelClass: S.str(),
  }),
})

/** The circuit is tested by its effects in a simulation over several steps. */
export const SIMULATION_PLAY = S.obj({
  editor: S.oneOf(['circuit']),
  judge: S.oneOf(['simulation']),
  resources: S.str(),
  label,
  layout: S.str(),
})
