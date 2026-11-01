// What the __name__ domain's cards are called and what they do, for the boards, the tray and the components box. A
// part's description says only what it does (games/DESIGN.md 4).
import { ArrowRightFromLine, Minus, Plus } from 'lucide-react'

const T = (zh, en) => ({ zh, en })

export const CARDS = {
  in: { name: T('输入', 'Input'), icon: ArrowRightFromLine, family: 'given', desc: T('这个测试给的值。', 'The value this test gives.') },
  out: { name: T('输出', 'Output'), icon: ArrowRightFromLine, family: 'end', desc: T('接到这里的值，就是电路的输出。', 'The value wired here is the circuit’s output.') },
  add: { name: T('相加', 'Add'), icon: Plus, family: 'value', desc: T('给出两个输入之和；只要有一个输入为「—」，就给出「—」。', 'Gives the sum of its two inputs; gives 「—」 if either input is 「—」.') },
  sub: { name: T('相减', 'Subtract'), icon: Minus, family: 'value', desc: T('给出第一个输入减去第二个输入的差；只要有一个输入为「—」，就给出「—」。', 'Gives its first input less its second; gives 「—」 if either input is 「—」.') },
}

export const PORT_LABELS = {}
