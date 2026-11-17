// The circuit domain's vocabulary (games/DESIGN.md 6.2): every thing a circuit game's content may name, each with what
// it is and the schema of its parameters, and the schemas of game.json and of one level. Content is these items and
// their parameters, and nothing else: whatever a level needs that is not here is a new item, written in this domain.
//
// A game's parts are its own, defined as data in its parts.json (games/DESIGN.md 6.8) over the engine resources here
// (`op`, implemented in ops.js) and coloured by family (`family`, ui/circuit.css).

import { S } from 'kernel'


import { qualifyVocabulary } from 'kernel'


import { defineVocabulary } from 'kernel'


import { GAME, PORT, levelSchema } from '../level-schema.js'


import { OP_ITEMS } from "./ops.js"
import { T as t } from 'kernel'



const item = (about, params) => ({ about, ...(params ? { params } : {}) })

/* ---------- what parts are made of ---------- */

const FAMILIES = {
  value: item(t('算数的元件')),
}

/* ---------- a level ---------- */

const VALUES = S.map(S.num(), { about: t('每个输入或输出的值，按名字') })
const TEST = S.obj({ inputs: VALUES, expect: VALUES })
// What a level says once; then each task: its puzzle, done in turn (../../engine/level-schema.js levelSchema).
const LEVEL = levelSchema({
  test: TEST,
  ports: {
    inputs: S.list(PORT),
  },
})

export const vocabulary = qualifyVocabulary('circuit', defineVocabulary({
  module: 'circuit',
  version: 1,
  kinds: { op: OP_ITEMS, family: FAMILIES },
  game: GAME,
  level: LEVEL,
}))
