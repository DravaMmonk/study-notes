// 0-8 暗箱, the camera obscura: x = −f·X/Z, and a bigger hole is brighter but blurrier. The bench's workings are
// kit/domains/image/benches/obscura.js; here are its table, its goal and verify(), which proves the goal can be
// reached and that each naive setting fails.
import { obscuraBench } from '../../kit/domains/image/benches/obscura.js'

const OBSCURA = obscuraBench({
  arrow: 100,
  shaft: 4,
  table: 640,
  plate: [150, 520],
  gap: 20,
  holes: [0.3, 0.6, 1, 1.6, 2.5],
  goal: { height: 30, slack: 1, blur: 1.5, light: 1 },
  start: { Z: 360, s: 430, D: 2.5 },
})

const verify = () => {
  const { START, HOLES, solved, settings } = OBSCURA
  if (solved(START)) return 'the starting setting already passes'
  const good = [...settings()].filter(solved)
  if (!good.length) return 'no setting meets all three goals'
  // The naive moves: pinhole as small as possible, or as big as possible; neither may pass anywhere.
  const holes = new Set(good.map((g) => g.D))
  if (holes.has(HOLES[0])) return 'the smallest hole passes, so brightness teaches nothing'
  if (holes.has(HOLES.at(-1))) return 'the biggest hole passes, so blur teaches nothing'
  // Height must come from the ratio f/Z: a passing f at one Z fails at another.
  const sample = good[0]
  if (solved({ ...sample, Z: sample.Z + 40, s: sample.s + 40 })) return 'height does not depend on f/Z'
  return ''
}

const obscura = {
  id: '0-8',
  kind: 'board',
  board: 'OpticsObscura',
  chapter: 0,
  title: { zh: '暗箱', en: 'Camera obscura' },
  brief: { zh: '让箭头在屏幕上成 30 mm 高的像：要够清楚，也要够亮。', en: 'Make the arrow form a 30 mm tall image on the screen: sharp enough, and bright enough.' },
  hint: { zh: '拖孔板和屏幕，在孔板上换孔。一次只动一样，看像高、模糊、亮度各跟着什么变。', en: 'Drag the pinhole plate and the screen, and change the hole in the plate. Move one thing at a time and watch what each of image height, blur and brightness follows.' },
  after: { zh: '像高只看比例：x = −f·X/Z，屏幕离孔越远、物体离孔越近，像越大，而且总是倒的。孔越大，同一点的光在屏上铺成越大的斑 D·(Z+f)/Z，像越亮也越糊；屏幕拉近也更亮。', en: 'Image height depends only on a ratio: x = −f·X/Z. The farther the screen is from the hole and the nearer the object, the bigger the image, and it is always upside down. The bigger the hole, the bigger the spot D·(Z+f)/Z that light from one point spreads into on the screen, so the image gets brighter and blurrier; moving the screen closer also makes it brighter.' },
  requires: ['0-1'],
  unlocks: [],
  model: OBSCURA,
  verify,
}

export const levels = [obscura]
