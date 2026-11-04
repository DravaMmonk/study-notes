// What the cards a __name__ level puts on its board are called and what they do. A game's own parts are described in
// its parts.json (games/DESIGN.md 6.9).
import { ArrowRightFromLine } from 'lucide-react'

const T = (zh, en) => ({ zh, en })

export const CARDS = {
  in: { name: T('输入', 'Input'), icon: ArrowRightFromLine, family: 'given', desc: T('这个测试给的值。', 'The value this test gives.') },
  out: { name: T('输出', 'Output'), icon: ArrowRightFromLine, family: 'end', desc: T('接到这里的值，就是电路的输出。', 'The value wired here is the circuit’s output.') },
}
