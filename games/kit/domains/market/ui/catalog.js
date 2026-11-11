// What the market domain's cards are called and what they do, for the boards, the tray and the components box (a
// task's street cards are the base's own). A part's description says only what it does (games/DESIGN.md 4).
import { Hash, Minus, Plus, X } from 'lucide-react'
import { T } from '../../../shell/i18n.js'

export const CARDS = {
  const: { name: T('常数'), icon: Hash, family: 'value', desc: T('每一拍都给出设定的数。') },
  add: { name: T('加', 'Add'), icon: Plus, family: 'value', desc: T('给出 a + b。') },
  sub: { name: T('减', 'Subtract'), icon: Minus, family: 'value', desc: T('给出 a − b。', 'Gives a − b.') },
  mul: { name: T('乘'), icon: X, family: 'value', desc: T('给出 a × b。') },
}
