// Content prototypes are declared by kernel modules and stored as named package objects.
import { S } from './schema.js'

const SYMBOL_FIELDS = { mark: S.ref('mark'), name: S.text(), desc: S.text(), icon: S.str({ view: 'icon' }) }
export const SYMBOL = S.obj({ ...SYMBOL_FIELDS, stages: S.opt(S.list(S.obj({
  id: S.str({ pattern: '^(?:[a-z][a-z0-9-]*/)?[A-Za-z_][A-Za-z0-9_-]*$' }),
  ...Object.fromEntries(Object.entries(SYMBOL_FIELDS).map(([key, schema]) => [key, S.opt(schema)])),
}))) })

export const CONTENT_KINDS = {
  symbol: { module: 'logic', folder: 'symbols', about: { en: 'Formula symbol', zh: '符号' }, schema: SYMBOL },
  wordset: { module: 'logic', about: { en: 'A named formula-reading dictionary' }, schema: S.map(S.text()) },
  quote: { module: 'circuit', about: { en: 'Quoted names', zh: '可引用的名字' }, schema: S.obj({ text: S.str() }) },
  power: { module: 'image', about: { en: 'Power-on introduction', zh: '上电导语' }, schema: S.obj({ title: S.text(), lines: S.list(S.text()) }) },
  box: { module: 'image', about: { en: 'Part preview configuration', zh: '元件预览配置' }, schema: S.obj({ sample: S.level(), inLevel: S.map(S.level(), { key: S.ref('unlock') }), boards: S.opt(S.map(S.board(), { key: S.ref('unlock') })) }) },
}

export const contentKindSchemas = Object.fromEntries(Object.entries(CONTENT_KINDS).map(([kind, definition]) => [kind, definition.schema]))

export function registerContentKinds(registry, module) {
  for (const [kind, definition] of Object.entries(CONTENT_KINDS)) if (definition.module === module) {
    registry.add('contentKind', `${module}:${kind}`, { about: definition.about, kind, folder: definition.folder ?? kind, schema: definition.schema })
  }
}
