// What the net domain's fixed cards are called and what they do: its wires in and out (a task's inputs and outputs are
// the base's own cards, its parts a game's pieces.json). A description says only what a card does (games/DESIGN.md 4).
import { ArrowRightFromLine } from 'lucide-react'
import { T } from '../../../shell/i18n.js'

export const CARDS = {
  rx: { name: T('进线'), icon: ArrowRightFromLine, family: 'given', desc: T('这一拍从线上到达的位。') },
  tx: { name: T('出线'), icon: ArrowRightFromLine, family: 'end', desc: T('接到这里的位，这一拍说到线上；不接或接来的是「—」时说 0，「是」说 1、「否」说 0。') },
}
