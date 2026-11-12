// What the calculus domain's cards are called and what they do, for the boards, the tray and the components box (a
// task's input and output sequences are the base's own cards). A part's description says only what it does
// (games/DESIGN.md 4).
import { ArrowDownToLine, ArrowUpFromLine, ChevronLeft, Divide, Hash, Orbit, Plus, X } from 'lucide-react'
import { T } from '../../../shell/i18n.js'

export const CARDS = {
  add: { name: T('加', 'Add'), icon: Plus, family: 'value', desc: T('给出 a + b。') },
  mul: { name: T('乘'), icon: X, family: 'value', desc: T('给出 a × b。') },
  recip: { name: T('倒数'), icon: Divide, family: 'value', desc: T('给出 1/a；a 为 0 时没有值。') },
  less: { name: T('比较', 'Less'), icon: ChevronLeft, family: 'value', desc: T('a 小于 b 时给出 1，否则给出 0。') },
  gravity: { name: T('引力因子', 'Gravity factor'), icon: Orbit, family: 'value', desc: T('给出 1/(x²+y²)^(3/2)；原点没有值。') },
  const: { name: T('常数'), icon: Hash, family: 'value', desc: T('每一拍都给出设定的数。') },
  reg: {
    name: T('读寄存卡'), icon: ArrowUpFromLine, family: 'memory',
    desc: T('给出同名寄存卡中存的值；尚未存入时，给出初值。'),
  },
  keep: { name: T('存寄存卡'), icon: ArrowDownToLine, family: 'memory', desc: T('把接入的值存进同名寄存卡，从下一拍起可以读出。') },
}

export const PORT_LABELS = {}
