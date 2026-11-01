// What the net domain's cards are called and what they do, for the boards, the tray and the components box. A part's
// description says only what it does (games/DESIGN.md 4).
import { ArrowDownToLine, ArrowRightFromLine, ArrowUpFromLine, Binary, Equal, Hash, Plus, Split } from 'lucide-react'

const T = (zh, en) => ({ zh, en })

export const CARDS = {
  rx: { name: T('进线', 'Wire in'), icon: ArrowRightFromLine, family: 'given', desc: T('这一拍从线上到达的位。', 'The bit arriving on the wire this tick.') },
  tx: { name: T('出线', 'Wire out'), icon: ArrowRightFromLine, family: 'end', desc: T('接到这里的位，这一拍说到线上；不接或接来的是「—」时说 0，「是」说 1、「否」说 0。', 'The bit wired here is said on the wire this tick; 0 when nothing is wired or what is wired gives 「—」; yes is said as 1 and no as 0.') },
  in: { name: T('输入', 'Input'), icon: ArrowRightFromLine, family: 'given', desc: T('这一拍关卡给的值。', 'The value the level gives this tick.') },
  out: { name: T('输出', 'Output'), icon: ArrowRightFromLine, family: 'end', desc: T('接到这里的值，就是电路这一拍的输出。', 'The value wired here is the circuit’s output this tick.') },
  reg: {
    name: T('读寄存卡', 'Register'), icon: ArrowUpFromLine, family: 'memory',
    desc: T('给出同名寄存卡中存的值；尚未存入时，给出初值（「—」或设定的数）。', 'Gives the value held in the register of the same name; before anything is stored, gives its start value (「—」 or the number set).'),
  },
  keep: { name: T('存寄存卡', 'Keep'), icon: ArrowDownToLine, family: 'memory', desc: T('把接入的值存进同名寄存卡，从下一拍起可以读出。', 'Stores its input in the register of the same name; it can be read from the next tick on.') },
  const: { name: T('常数', 'Constant'), icon: Hash, family: 'value', desc: T('始终给出设定的数。', 'Always gives the number it is set to.') },
  select: { name: T('选择', 'Select'), icon: Split, family: 'logic', desc: T('「条件」为「是」或 1 时给出「是」输入，为「否」或 0 时给出「否」输入，为「—」时给出「—」；未接线的输入读作「—」。', 'Gives its Yes input when Condition is yes or 1, its No input when Condition is no or 0, and 「—」 when Condition is 「—」; an unconnected input reads 「—」.') },
  add: { name: T('相加', 'Add'), icon: Plus, family: 'value', desc: T('给出两个数之和。只要有一个输入为「—」，就给出「—」。', 'Gives the sum of its two numbers. Gives 「—」 if either input is 「—」.') },
  equal: { name: T('相等', 'Equal'), icon: Equal, family: 'logic', desc: T('两个数相同时给出「是」，否则给出「否」（「是」算作 1，「否」算作 0）。只要有一个输入为「—」，就给出「—」。', 'Gives yes when its two numbers are the same, no otherwise (yes counts as 1, no as 0). Gives 「—」 if either input is 「—」.') },
  bit: { name: T('取位', 'Bit of'), icon: Binary, family: 'value', desc: T('给出 8 位数「数」从最高位数起的第「位」位（第 0 位是最高位）；「位」不在 0 到 7 之间，或有一个输入为「—」时，给出「—」。', 'Gives bit “Index” of the 8-bit number “Number”, counting from the top (bit 0 is the highest); gives 「—」 when the index is not 0 to 7 or either input is 「—」.') },
}

/** A part's forms by key, as its card offers them: { type: { form: label } }. */
export const FORMS = {}

export const PORT_LABELS = {
  select: { if: T('条件', 'Condition'), yes: T('是', 'Yes'), no: T('否', 'No') },
  bit: { n: T('数', 'Number'), i: T('位', 'Index') },
}
