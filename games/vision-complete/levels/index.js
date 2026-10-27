// 视觉完备's course: its chapters, one era each (route.js), the levels of every chapter, the parts it starts from, and
// the level each way of drawing a picture comes with. The image domain (kit/domains/image/course.js) puts them in
// play order and fills in what every level shares.
import { imageCourse } from '../../kit/domains/image/course.js'
import * as ch0 from './ch0.js'
import * as ch1 from './ch1.js'
import * as ch2 from './ch2.js'
import * as ch3 from './ch3.js'
import * as ch4 from './ch4.js'
import * as ch7 from './ch7.js'
import * as ch6 from './ch6.js'
import * as optics from './pack-optics.js'
import * as ch5 from './ch5.js'
import * as ch8 from './ch8.js'
import * as ch9 from './ch9.js'
import * as ch10 from './ch10.js'
import * as ch11 from './ch11.js'
import { ERAS } from './route.js'

const CHAPTERS = [
  { id: 0, title: { zh: '睁眼', en: 'Opening Eyes' }, lecture: { zh: '第 1–2 讲', en: 'Lectures 1–2' }, question: { zh: '图像是什么', en: 'What is an image?' } },
  { id: 1, title: { zh: '邻居', en: 'Neighbours' }, lecture: { zh: '第 3 讲', en: 'Lecture 3' }, question: { zh: '怎样用邻居算出新图', en: 'How do neighbours make a new image?' } },
  { id: 2, title: { zh: '频率', en: 'Frequency' }, lecture: { zh: '第 4 讲', en: 'Lecture 4' }, question: { zh: '图像由哪些波组成', en: 'Which waves make up an image?' } },
  { id: 3, title: { zh: '光与边', en: 'Light and Edges' }, lecture: { zh: '第 5 讲', en: 'Lecture 5' }, question: { zh: '照片的明暗从哪来', en: 'Where do light and shade come from?' } },
  { id: 4, title: { zh: '学会看', en: 'Learning to See' }, lecture: { zh: '第 6–8 讲', en: 'Lectures 6–8' }, question: { zh: '机器怎样自己学会', en: 'How does a machine learn by itself?' } },
  { id: 5, title: { zh: '全局视野', en: 'The Whole Picture' }, lecture: { zh: '第 9–10 讲', en: 'Lectures 9–10' }, question: { zh: '一步看到全图', en: 'Seeing the whole image in one step' } },
  { id: 6, title: { zh: '认出同一个点', en: 'The Same Point Again' }, lecture: { zh: '第 11–12 讲', en: 'Lectures 11–12' }, question: { zh: '哪些点容易再找到', en: 'Which points are easy to find again?' } },
  { id: 7, title: { zh: '第三个维度', en: 'The Third Dimension' }, lecture: { zh: '第 13–14 讲', en: 'Lectures 13–14' }, question: { zh: '两只眼睛怎样看出远近', en: 'How do two eyes judge distance?' } },
  { id: 8, title: { zh: '画出没见过的图', en: 'Drawing the Unseen' }, lecture: { zh: '第 15–17 讲', en: 'Lectures 15–17' }, question: { zh: '从随机数生成图像', en: 'Making images from random numbers' } },
  { id: 9, title: { zh: '每个像素是什么', en: 'What Every Pixel Is' }, lecture: { zh: '第 19–20 讲', en: 'Lectures 19–20' }, question: { zh: '给每个像素一个答案', en: 'An answer for every pixel' } },
  { id: 10, title: { zh: '框出来', en: 'Boxing Things In' }, lecture: { zh: '第 21–22 讲', en: 'Lectures 21–22' }, question: { zh: '东西在哪、有多大', en: 'Where things are, and how big' } },
  { id: 11, title: { zh: '看它在看哪', en: 'Where Is It Looking?' }, lecture: { zh: '第 23 讲', en: 'Lecture 23' }, question: { zh: '它认的是车还是路', en: 'Does it see the car or the road?' } },
]

/** The parts no circuit can build: arithmetic, a few functions, averaging, the trip to the frequency domain and the
 *  learnable numbers. Each is new where it is first offered. */
const PRIMITIVES = ['const', 'add', 'sub', 'mul', 'arith', 'merge', 'sqrt', 'exp', 'globalMax', 'fqApply', 'lrnConst', 'learn3', 'lrnConv', 'warp', 'zeroUp', 'argmin4', 'dg_encode', 'dg_decode', 'dg_mu', 'dg_sigma', 'dg_sample']
// Parts that are one idea: the four kinds of arithmetic and the constant, and the learnable kernel with or without a
// random start.
const CONCEPT = { const: 'arithmetic', add: 'arithmetic', sub: 'arithmetic', mul: 'arithmetic', arith: 'arithmetic', lrnConv: 'learn3', dg_encode: 'autoencoder', dg_decode: 'autoencoder', dg_encoder: 'autoencoder', dg_decoder: 'autoencoder', dg_mu: 'latent', dg_sigma: 'latent', dg_sample: 'latent' }


// Pictures start out drawn as pixels; every other way of drawing them comes in with a level, as parts do.
const VIEWS = { profile: '1-1', terrain: '1-4', spectrum: '2-6', slope: '3-7' }

const PACKS = [ch0, ch1, ch2, ch3, ch4, ch5, ch6, ch7, ch8, ch9, ch10, ch11, optics]

// From chapter 1 the four kinds of arithmetic are one part: once met, it takes the place of Add, Subtract and Multiply.
const REPLACES = { arith: ['add', 'sub', 'mul'] }

export const IMAGE = imageCourse({ eras: ERAS, chapters: CHAPTERS, levels: PACKS.flatMap((pack) => pack.levels), views: VIEWS, primitives: PRIMITIVES, concept: CONCEPT, replaces: REPLACES })
export const { LEVELS, levelById, course } = IMAGE
export { PRIMITIVES }
