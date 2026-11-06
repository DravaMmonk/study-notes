// What the __name__ domain's cards are called and what they do, for the boards, the tray and the components box (a
// task's inputs and outputs are the base's own cards). A part's description says only what it does
// (games/DESIGN.md 4).
import { Activity, ArrowDownToLine, ArrowUpFromLine, Hash, Megaphone } from 'lucide-react'
import { T } from '../../../shell/i18n.js'
import { LINE } from '../line.js'


export const CARDS = {
  line: { name: LINE, icon: Activity, family: 'given', desc: T('这一拍线上的位。', 'The bit on the line this tick.') },
  say: { name: T('说', 'Say'), icon: Megaphone, family: 'end', desc: T('接到这里的位，这一拍说到线上。', 'The bit wired here goes on the line this tick.') },
  reg: {
    name: T('读寄存卡', 'Register'), icon: ArrowUpFromLine, family: 'memory',
    desc: T('给出同名寄存卡中存的值；尚未存入时，给出初值（「—」或设定的数）。', 'Gives the value held in the register of the same name; before anything is stored, gives its start value (「—」 or the number set).'),
  },
  keep: { name: T('存寄存卡', 'Keep'), icon: ArrowDownToLine, family: 'memory', desc: T('把接入的值存进同名寄存卡，从下一拍起可以读出。', 'Stores its input in the register of the same name; it can be read from the next tick on.') },
  const: { name: T('常数', 'Constant'), icon: Hash, family: 'value', desc: T('始终给出设定的数。', 'Always gives the number it is set to.') },
}

/** A part's forms by key, as its card offers them: { type: { form: label } }. */
export const FORMS = {}

export const PORT_LABELS = {}
