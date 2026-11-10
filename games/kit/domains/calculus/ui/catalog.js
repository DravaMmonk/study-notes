// What the calculus domain's cards are called and what they do, for the boards, the tray and the components box (a
// task's input and output sequences are the base's own cards). A part's description says only what it does
// (games/DESIGN.md 4).
import { ArrowDownToLine, ArrowUpFromLine, Hash, Plus, X } from 'lucide-react'
import { T } from '../../../shell/i18n.js'

export const CARDS = {
  add: { name: T('加', 'Add'), icon: Plus, family: 'value', desc: T('给出 a + b。', 'Gives a + b.') },
  mul: { name: T('乘', 'Multiply'), icon: X, family: 'value', desc: T('给出 a × b。', 'Gives a × b.') },
  const: { name: T('常数', 'Constant'), icon: Hash, family: 'value', desc: T('每一拍都给出设定的数。', 'Gives the number it is set to, every tick.') },
  reg: {
    name: T('读寄存卡', 'Register'), icon: ArrowUpFromLine, family: 'memory',
    desc: T('给出同名寄存卡中存的值；尚未存入时，给出初值。', 'Gives the value held in the register of the same name; before anything is stored, its start value.'),
  },
  keep: { name: T('存寄存卡', 'Keep'), icon: ArrowDownToLine, family: 'memory', desc: T('把接入的值存进同名寄存卡，从下一拍起可以读出。', 'Stores its input in the register of the same name; it can be read from the next tick on.') },
}

export const PORT_LABELS = {}
