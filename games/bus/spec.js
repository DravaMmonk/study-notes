// 车在说话 The Car Talks: the CAN bus and diagnostics, from one line anyone can pull low to a tester that reads and
// reflashes a car, as a Turing Complete style game on the can domain (kit/domains/can). Everything here is the course:
// the levels (levels.js) and the encyclopedia (glossary.js); the game it makes is game.js. The design is DESIGN.md
// beside this file.
import { busCourse } from '../kit/domains/can/course.js'
import { entries, groups } from './glossary.js'
import { levels } from './levels.js'

const T = (zh, en) => ({ zh, en })

const eras = [
  {
    id: 1,
    title: T('监听探针', 'The probe'),
    question: T('插上总线，上面在说什么？', 'Plugged into the bus: what is being said on it?'),
    foundation: ['1-1', '1-2', '1-3', '1-4', '1-5', '1-6', '1-7', '1-8', '1-9'],
  },
]

const BUS = busCourse({ eras, levels })

export default {
  id: 'bus',
  domain: 'can',
  title: T('车在说话', 'The Car Talks'),
  // Still in development: the start of chapter 1 of the course in DESIGN.md.
  kicker: T('开发中 · 车载总线与诊断', 'In development · In-vehicle bus and diagnostics'),
  lede: T(
    '车上的几十个控制器共用一根线说话。从"每一拍线上有一位"开始，亲手搭出听懂它们的探针，再一步步长成能读故障码、能刷写软件的诊断仪。',
    'The dozens of controllers in a car talk over one shared line. Starting from “one bit on the line each tick”, build a probe that understands them, and grow it step by step into a tester that reads fault codes and reflashes software.',
  ),
  eras,
  bus: BUS,
  levels: BUS.LEVELS,
  course: BUS.course,
  glossary: { groups, entries },
  saves: [],
  texts: { chapters: BUS.CHAPTERS, glossary: entries },
}
