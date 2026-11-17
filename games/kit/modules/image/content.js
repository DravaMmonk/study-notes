import { S } from '../../engine/schema.js'
export const contentKinds = {
  power: { module: 'image', about: { en: 'Power-on introduction', zh: '上电导语' }, schema: S.obj({ title: S.text(), lines: S.list(S.text()) }) },
  box: { module: 'image', about: { en: 'Part preview configuration', zh: '元件预览配置' }, schema: S.obj({ sample: S.level(), inLevel: S.map(S.level(), { key: S.ref('unlock') }), boards: S.opt(S.map(S.board(), { key: S.ref('unlock') })) }) },
}
