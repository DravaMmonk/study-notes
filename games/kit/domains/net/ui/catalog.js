// What the net domain's cards are called and what they do, for the boards, the tray and the components box (a task's
// inputs and outputs are the base's own cards). A part's description says only what it does (games/DESIGN.md 4).
import { ArrowDownToLine, ArrowRightFromLine, ArrowUpFromLine, Binary, Equal, Hash, Plus, Split } from 'lucide-react'
import { T } from '../../../shell/i18n.js'


export const CARDS = {
  rx: { name: T('进线'), icon: ArrowRightFromLine, family: 'given', desc: T('这一拍从线上到达的位。') },
  tx: { name: T('出线'), icon: ArrowRightFromLine, family: 'end', desc: T('接到这里的位，这一拍说到线上；不接或接来的是「—」时说 0，「是」说 1、「否」说 0。') },
  reg: {
    name: T('读寄存卡'), icon: ArrowUpFromLine, family: 'memory',
    desc: T('给出同名寄存卡中存的值；尚未存入时，给出初值（「—」或设定的数）。'),
  },
  keep: { name: T('存寄存卡'), icon: ArrowDownToLine, family: 'memory', desc: T('把接入的值存进同名寄存卡，从下一拍起可以读出；接入的是「—」时也存进去，不接时不存，寄存卡留着原来的值。') },
  const: { name: T('常数'), icon: Hash, family: 'value', desc: T('始终给出设定的数。') },
  select: { name: T('选择'), icon: Split, family: 'logic', desc: T('「条件」为「是」或 1 时给出「是」输入，为「否」或 0 时给出「否」输入，为「—」时给出「—」；未接线的输入读作「—」。') },
  add: { name: T('相加'), icon: Plus, family: 'value', desc: T('给出两个数之和。只要有一个输入为「—」，就给出「—」。') },
  equal: { name: T('相等'), icon: Equal, family: 'logic', desc: T('两个数相同时给出「是」，否则给出「否」（「是」算作 1，「否」算作 0）。只要有一个输入为「—」，就给出「—」。') },
  bit: { name: T('取位'), icon: Binary, family: 'value', desc: T('给出 8 位数「数」从最高位数起的第「位」位（第 0 位是最高位）；「位」不在 0 到 7 之间，或有一个输入为「—」时，给出「—」。') },
}

/** A part's forms by key, as its card offers them: { type: { form: label } }. */
export const FORMS = {}

export const PORT_LABELS = {
  select: { if: T('条件'), yes: T('是', 'Yes'), no: T('否', 'No') },
  bit: { n: T('数'), i: T('位') },
}
