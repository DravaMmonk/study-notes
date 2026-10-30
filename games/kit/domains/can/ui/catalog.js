// What the can domain's cards are called and what they do, for the boards, the tray and the components box. A part's
// description says only what it does (games/DESIGN.md 4).
import { Activity, ArrowDownToLine, ArrowRightFromLine, ArrowUpFromLine, Calculator, Equal, Hash, Split } from 'lucide-react'

const T = (zh, en) => ({ zh, en })

export const CARDS = {
  line: { name: T('总线', 'Bus'), icon: Activity, family: 'given', desc: T('这一拍总线上的那一位：0 是显性，1 是隐性。', 'This tick’s bit on the bus: 0 is dominant, 1 recessive.') },
  in: { name: T('输入', 'Input'), icon: ArrowRightFromLine, family: 'given', desc: T('这一拍关卡给的值。', 'The value the level gives this tick.') },
  out: { name: T('输出', 'Output'), icon: ArrowRightFromLine, family: 'end', desc: T('接到这里的值，是这一拍板交出的结果。', 'What is wired here is the board’s result this tick.') },
  reg: {
    name: T('读寄存卡', 'Register'), icon: ArrowUpFromLine, family: 'memory',
    desc: T('给出它名字的那张寄存卡存着的值；还没存过时给出初值（「—」或设的数）。', 'Gives what the register of its name holds; before anything is kept there, its start value (「—」 or the number set).'),
  },
  keep: { name: T('存寄存卡', 'Keep'), icon: ArrowDownToLine, family: 'memory', desc: T('把接到它的值存进它名字的那张寄存卡，下一拍起读得出来。', 'Keeps what is wired into it in the register of its name, to be read from the next tick on.') },
  const: { name: T('常数', 'Constant'), icon: Hash, family: 'value', desc: T('总是给出设的那个数。', 'Always gives the number it is set to.') },
  select: { name: T('选择', 'Select'), icon: Split, family: 'logic', desc: T('「条件」为「是」或 1 时给出「是」那一路，为「否」或 0 时给出「否」那一路；没接的一路读作「—」。', 'Gives its Yes input when Condition is yes or 1, its No input when it is no or 0; an input left open reads 「—」.') },
  compare: { name: T('比较', 'Compare'), icon: Equal, family: 'logic', desc: T('「相等」：两个值相等时给出「是」，否则「否」。「小于」：第一个比第二个小时给出「是」。有一个是「—」就给出「—」。', 'Equal: yes when its two values are equal, no otherwise. Less than: yes when the first is smaller than the second. 「—」 when either is 「—」.') },
  arith: { name: T('算术', 'Arithmetic'), icon: Calculator, family: 'value', desc: T('「加一」：输入加 1。「相加」：两个输入的和。有一个是「—」就给出「—」。', 'Add one: its input plus 1. Add: the sum of its two inputs. 「—」 when an input is 「—」.') },
}

export const FORMS = {
  compare: { eq: T('相等', 'Equal'), lt: T('小于', 'Less than') },
  arith: { inc: T('加一', 'Add one'), add: T('相加', 'Add') },
}

export const PORT_LABELS = {
  select: { if: T('条件', 'Condition'), yes: T('是', 'Yes'), no: T('否', 'No') },
}
