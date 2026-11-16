// The tick-bus domain's vocabulary (games/DESIGN.md 6.2): every thing a tick-bus game's content may name, each with what
// it is and the schema of its parameters, and the schemas of game.json and of one level. Content is these items and
// their parameters, and nothing else: whatever a level needs that is not here is a new item, written in this domain.
//
// The items are implemented next to them: a game's parts in its pieces.json, the signals a level wants in wants.js, the line a test
// plays on in line.js.

import { S } from '../../engine/schema.js'
import { qualifyVocabulary } from '../../engine/capabilities.js'
import { defineVocabulary } from '../../engine/vocabulary.js'
import { GAME, PORT, levelSchema } from '../../engine/level-schema.js'
import { T as t } from '../../shell/i18n.js'

const item = (about, params) => ({ about, ...(params ? { params } : {}) })

const BITS = S.str({ pattern: '^[01.]*$', about: t('一拍一个字符：0、1，或 . 表示什么也不说') })

/* ---------- the parts ---------- */

// A game's parts are its pieces.json, computing with the kernel's builtins and registers (no resources of its own),
// coloured by family (ui/tick-bus.css).
const FAMILIES = {
  value: item(t('算数的元件')),
  memory: item(t('读写寄存器的元件')),
}

/* ---------- what an output must be ---------- */

const WANTS = {
  line: item(t('这一拍线上的位')),
  delayed: item(t('输入 input 上一拍的值；第一拍给 first'), S.obj({ input: S.str(), first: S.int() })),
}

/* ---------- a level ---------- */

const TEST = S.obj({
  line: BITS,
  inputs: S.opt(S.map(S.list(S.int()), { about: t('每个输入每一拍的值') })),
})
// What a level says once; then each task: its puzzle, done in turn (../../engine/level-schema.js levelSchema).
const LEVEL = levelSchema({
  test: TEST,
  ports: {
    listens: S.opt(S.bool({ about: t('板上有线元件') })),
    talks: S.opt(S.bool({ about: t('板上有「说」元件：接到它的位每一拍说到线上') })),
    inputs: S.opt(S.list(PORT)),
    outputs: S.opt(S.list(PORT)),
  },
  checks: { want: S.map(S.call('want'), { about: t('每个输出（和 say）每一拍应当是什么') }) },
})

export const vocabulary = qualifyVocabulary('tick-bus', defineVocabulary({
  module: 'tick-bus',
  version: 1,
  kinds: { op: {}, family: FAMILIES, want: WANTS },
  game: GAME,
  level: LEVEL,
}))
