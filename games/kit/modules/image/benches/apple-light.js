// Two surfaces under one neutral light: each channel is scaled by the same positive illumination.
import { S } from '../../../engine/schema.js'
import { T as t } from '../../../shell/i18n.js'

export const appleLight = {
  about: t('白光下比较两个物体的 RGB 通道，调节光强并辨认红色物体'),
  setup: S.obj({ colours: S.list(S.list(S.num(), { min: 3, max: 3 }), { min: 2, max: 2 }), red: S.int({ min: 0, max: 1 }) }),
  make({ colours, red }) {
    return {
      view(v) {
        return { channels: colours.map((colour) => colour.map((c) => c * v.light)), correct: v.pick === red }
      },
    }
  },
  verify(model, bench) {
    const { colours, red } = bench.setup
    if (colours.some((c) => c.some((v) => v < 0 || v > 1) || c.reduce((a, b) => a + b, 0) === 0)) return '颜色必须为非零的 0–1 RGB 值'
    const isRed = (c) => c[0] / (c[0] + c[1] + c[2]) > 0.5
    if (!isRed(colours[red]) || isRed(colours[1 - red])) return '恰有指定的物体符合红色色度条件'
    const { light, pick } = bench.knobs
    if (!light || light.min <= 0 || !pick?.choices?.some((c) => c.value === red) || !pick.choices.some((c) => c.value === 1 - red)) return '需要正光强范围和两个物体的选择'
    if (!model.view({ light: light.min, pick: red }).correct || model.view({ light: light.max, pick: 1 - red }).correct) return '选择的判断不正确'
    return ''
  },
}
