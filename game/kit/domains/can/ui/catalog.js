// What the can domain's cards are called and what they do, for the boards, the tray and the components box. A part's
// description says only what it does (games/DESIGN.md 4).
import { Activity, ArrowDownToLine, ArrowRightFromLine, ArrowUpFromLine, Calculator, Equal, Hash, Split } from 'lucide-react'

const T = (zh, en) => ({ zh, en })

export const CARDS = {
  line: { name: T('总线', 'Bus'), icon: Activity, family: 'given', desc: T('这一拍总线上的位：0 为显性，1 为隐性。', 'The bit on the bus this tick: 0 is dominant, 1 is recessive.') },
  in: { name: T('输入', 'Input'), icon: ArrowRightFromLine, family: 'given', desc: T('这一拍关卡给的值。', 'The value the level gives this tick.') },
  out: { name: T('输出', 'Output'), icon: ArrowRightFromLine, family: 'end', desc: T('接到这里的值，就是电路这一拍的输出。', 'The value wired here is the circuit’s output this tick.') },
  reg: {
    name: T('读寄存卡', 'Register'), icon: ArrowUpFromLine, family: 'memory',
    desc: T('给出同名寄存卡中存的值；尚未存入时，给出初值（「—」或设定的数）。', 'Gives the value held in the register of the same name; before anything is stored, gives its start value (「—」 or the number set).'),
  },
  keep: { name: T('存寄存卡', 'Keep'), icon: ArrowDownToLine, family: 'memory', desc: T('把接入的值存进同名寄存卡，从下一拍起可以读出。', 'Stores its input in the register of the same name; it can be read from the next tick on.') },
  const: { name: T('常数', 'Constant'), icon: Hash, family: 'value', desc: T('始终给出设定的数。', 'Always gives the number it is set to.') },
  select: { name: T('选择', 'Select'), icon: Split, family: 'logic', desc: T('「条件」为「是」或 1 时给出「是」输入，为「否」或 0 时给出「否」输入；未接线的输入读作「—」。', 'Gives its Yes input when Condition is yes or 1, and its No input when Condition is no or 0; an unconnected input reads 「—」.') },
  compare: { name: T('比较', 'Compare'), icon: Equal, family: 'logic', desc: T('「相等」：两个值相等时给出「是」，否则给出「否」。「小于」：第一个值小于第二个值时给出「是」。只要有一个值为「—」，就给出「—」。', 'Equal: yes when its two values are equal, no otherwise. Less than: yes when the first is less than the second. Gives 「—」 if either value is 「—」.') },
  arith: { name: T('算术', 'Arithmetic'), icon: Calculator, family: 'value', desc: T('「加一」：输入加 1。「相加」：两个输入之和。只要有一个输入为「—」，就给出「—」。', 'Add one: its input plus 1. Add: the sum of its two inputs. Gives 「—」 if either input is 「—」.') },
}

export const FORMS = {
  compare: { eq: T('相等', 'Equal'), lt: T('小于', 'Less than') },
  arith: { inc: T('加一', 'Add one'), add: T('相加', 'Add') },
}

export const PORT_LABELS = {
  select: { if: T('条件', 'Condition'), yes: T('是', 'Yes'), no: T('否', 'No') },
}
