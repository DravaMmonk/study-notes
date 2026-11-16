// What the tick-bus domain's fixed cards are called and what they do: the line and what the board says on it (a task's
// inputs and outputs are the base's own cards, its parts a game's pieces.json). A description says only what a card does
// (games/DESIGN.md 4).
import { Activity, Megaphone } from 'lucide-react'
import { T } from '../../../shell/i18n.js'
import { LINE } from '../line.js'

export const CARDS = {
  line: { name: LINE, icon: Activity, family: 'given', desc: T('这一拍线上的位。') },
  say: { name: T('说'), icon: Megaphone, family: 'end', desc: T('接到这里的位，这一拍说到线上。') },
}
