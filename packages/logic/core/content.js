import { S } from 'kernel'
const SYMBOL_FIELDS = { mark: S.ref('mark'), name: S.text(), desc: S.text(), icon: S.str({ view: 'icon' }) }
export const SYMBOL = S.obj({ ...SYMBOL_FIELDS, stages: S.opt(S.list(S.obj({
  id: S.str({ pattern: '^(?:[a-z][a-z0-9-]*/)?[A-Za-z_][A-Za-z0-9_-]*$' }),
  ...Object.fromEntries(Object.entries(SYMBOL_FIELDS).map(([key, schema]) => [key, S.opt(schema)])),
}))) })

