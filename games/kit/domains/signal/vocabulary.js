// The signal domain's vocabulary (games/DESIGN.md 6.2): every thing a signal game's content may name, each with what
// it is and the schema of its parameters, and the schemas of game.json and of one level. Content is these items and
// their parameters, and nothing else: whatever a level needs that is not here is a new item, written in this domain.
//
// A game's parts are its own, defined as data in its parts.json (games/DESIGN.md 6.8) over the engine resources here
// (`op`, implemented in ops.js) and coloured by family (`family`, ui/signal.css).

import { S } from '../../engine/schema.js'
import { defineVocabulary } from '../../engine/vocabulary.js'
import { GAME, PORT, levelSchema } from '../../engine/circuit-domain.js'
import { OP_ITEMS } from './ops.js'
import { T as t } from '../../shell/i18n.js'

const item = (about, params) => ({ about, ...(params ? { params } : {}) })

/* ---------- what parts are made of ---------- */

const FAMILIES = {
  number: item(t('算数的元件')),
  wave: item(t('算波形的元件')),
}

/* ---------- a level ---------- */

// A value as content writes it: a number, or a wave as its samples in order (values.js).
const VALUE = S.either(S.num(), S.list(S.num(), { min: 2 }))
const VALUES = S.map(VALUE, { about: t('每个输入或输出的值，按名字：一个数，或一个波形（依次的各格）') })
const TEST = S.obj({ inputs: VALUES, expect: VALUES })
// What a level says once; then each task: its puzzle, done in turn (../../engine/circuit-domain.js levelSchema).
const LEVEL = levelSchema({
  test: TEST,
  ports: {
    inputs: S.list(PORT),
  },
})

export const vocabulary = defineVocabulary({
  domain: 'signal',
  version: 3,
  kinds: { op: OP_ITEMS, family: FAMILIES },
  game: GAME,
  level: LEVEL,
})
