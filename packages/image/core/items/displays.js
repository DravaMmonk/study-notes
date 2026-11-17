import { qualifyItems, T as t } from 'kernel'
export const DISPLAYS = qualifyItems('image', 'display', {
  obscura: { about: t('暗箱的侧视图：拖动孔板和屏幕（旋钮 Z、s）') },
  obscuraScreen: { about: t('屏幕正面：像的大小、模糊和亮度，目标高度画成一条线') },
})
