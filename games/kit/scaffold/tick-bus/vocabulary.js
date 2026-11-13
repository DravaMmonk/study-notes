// The __name__ domain's vocabulary (games/DESIGN.md 6.2): every thing a __name__ game's content may name, each with what
// it is and the schema of its parameters, and the schemas of game.json and of one level. Content is these items and
// their parameters, and nothing else: whatever a level needs that is not here is a new item, written in this domain.
//
// The items are implemented next to them: parts in parts.js, the signals a level wants in wants.js, the line a test
// plays on in line.js.

import { S } from '../../engine/schema.js'
import { defineVocabulary } from '../../engine/vocabulary.js'
import { GAME, PORT, levelSchema } from '../../engine/circuit-domain.js'
import { T as t } from '../../shell/i18n.js'

const item = (about, params) => ({ about, ...(params ? { params } : {}) })

const BITS = S.str({ pattern: '^[01.]*$', about: t('一拍一个字符：0、1，或 . 表示什么也不说') })

/* ---------- the parts ---------- */

const PARTS = {
  reg: item(t('读寄存卡：同名寄存卡里存的值，存入之前给初值')),
  keep: item(t('存寄存卡：接入的值存进同名寄存卡，下一拍读得出')),
  const: item(t('常数：设定的数')),
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
// What a level says once; then each task: its puzzle, done in turn (../../engine/circuit-domain.js levelSchema).
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

export const vocabulary = defineVocabulary({
  domain: '__name__',
  version: 9,
  kinds: { part: PARTS, want: WANTS },
  game: GAME,
  level: LEVEL,
})
