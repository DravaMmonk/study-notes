// What the cards a __name__ level puts on its board are called and what they do. A game's own parts are described in
// its parts.json (games/DESIGN.md 6.8).
import { ArrowRightFromLine } from 'lucide-react'
import { T } from '../../../shell/i18n.js'


export const CARDS = {
  in: { name: T('输入', 'Input'), icon: ArrowRightFromLine, family: 'given', desc: T('这个测试给的值。') },
  out: { name: T('输出', 'Output'), icon: ArrowRightFromLine, family: 'end', desc: T('接到这里的值，就是电路的输出。') },
}
