// What the can domain's cards are called and what they do, for the boards, the tray and the components box (a task's
// inputs and outputs are the base's own cards). A part's description says only what it does (games/DESIGN.md 4).
import { Activity, ArrowDownToLine, ArrowUpFromLine, Calculator, Equal, GitMerge, Hash, Minus, Split } from 'lucide-react'
import { T } from '../../../shell/i18n.js'
import { BUS } from '../bus.js'


export const CARDS = {
  line: { name: BUS, icon: Activity, family: 'given', desc: T('这一拍总线上的位：0 为显性，1 为隐性。') },
  drive: { name: T('说', 'Send'), icon: Activity, family: 'given', desc: T('这一拍驱动总线的位；说之前还听不到这一拍的总线。', 'The bit driven onto the bus this tick; the bus cannot be heard before speaking.') },
  reg: {
    name: T('读寄存卡'), icon: ArrowUpFromLine, family: 'memory',
    desc: T('给出同名寄存卡中存的值；尚未存入时，给出初值（「—」或设定的数）。'),
  },
  keep: { name: T('存寄存卡'), icon: ArrowDownToLine, family: 'memory', desc: T('把接入的值存进同名寄存卡，从下一拍起可以读出。') },
  const: { name: T('常数'), icon: Hash, family: 'value', desc: T('始终给出设定的数。') },
  select: { name: T('选择'), icon: Split, family: 'logic', desc: T('「条件」为「是」或 1 时给出「是」输入，为「否」或 0 时给出「否」输入；未接线的输入读作「—」。') },
  compare: { name: T('比较', 'Compare'), icon: Equal, family: 'logic', desc: T('「相等」：两个值相等时给出「是」，否则给出「否」。「小于」：第一个值小于第二个值时给出「是」。只要有一个值为「—」，就给出「—」。') },
  arith: { name: T('算术'), icon: Calculator, family: 'value', desc: T('「加一」：输入加 1。「相加」：两个输入之和。只要有一个输入为「—」，就给出「—」。') },
  xor: { name: T('异或', 'XOR'), icon: GitMerge, family: 'logic', desc: T('两个数逐位比较：相同为 0，不同为 1；按无符号 32 位运算。输入为「—」时给出「—」。', 'Compares two numbers bit by bit: 0 where equal, 1 where different, using unsigned 32-bit values. Gives 「—」 if an input is 「—」.') },
  subtract: { name: T('相减', 'Subtract'), icon: Minus, family: 'value', desc: T('第一个数减去第二个数。输入为「—」时给出「—」。', 'Subtracts the second number from the first; gives 「—」 if an input is 「—」.') },
  band: { name: T('按位与', 'Bitwise AND'), icon: GitMerge, family: 'logic', desc: T('两个数逐位取与；两位都是 1 时结果才是 1。按无符号 32 位运算。', 'ANDs two unsigned 32-bit values: a result bit is 1 only when both input bits are 1.') },
  shiftRight: { name: T('右移', 'Shift right'), icon: Split, family: 'logic', desc: T('将无符号 32 位数向右移动 0 到 31 位，高位补零。', 'Shifts an unsigned 32-bit value right by 0 to 31 bits, filling high bits with zero.') },
  sliceBytes: { name: T('截取字节', 'Slice bytes'), icon: Split, family: 'value', desc: T('从字节序列中按起点和长度截取连续字节；越界时给出「—」。', 'Takes a contiguous range from a byte sequence by start and length; gives 「—」 if out of bounds.') },
  concatBytes: { name: T('拼接字节', 'Join bytes'), icon: GitMerge, family: 'value', desc: T('按顺序拼接两个字节序列。', 'Joins two byte sequences in order.') },
}

export const FORMS = {
  compare: { eq: T('相等'), lt: T('小于') },
  arith: { inc: T('加一'), add: T('相加') },
}

export const PORT_LABELS = {
  select: { if: T('条件'), yes: T('是', 'Yes'), no: T('否', 'No') },
  shiftRight: { value: T('数值', 'Value'), amount: T('位数', 'Bits') },
  sliceBytes: { bytes: T('字节', 'Bytes'), start: T('起点', 'Start'), length: T('长度', 'Length') },
}
