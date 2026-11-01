// How the agent domain's cards look on a board, in the tray and in the components box: each card's words (../words.js)
// with its icon and family.
import { Brain, CircleStop, CornerDownLeft, Database, FileCode, FileText, FlaskConical, FolderTree, History, Layers, Ticket } from 'lucide-react'
import { WORDS } from '../words.js'

const LOOKS = {
  model: { icon: Brain, family: 'model' },
  concat: { icon: Layers, family: 'context' },
  read: { icon: FileText, family: 'tool' },
  list: { icon: FolderTree, family: 'tool' },
  test: { icon: FlaskConical, family: 'test' },
  issue: { icon: Ticket, family: 'given' },
  history: { icon: History, family: 'given' },
  code: { icon: FileCode, family: 'given' },
  repo: { icon: Database, family: 'end' },
  out: { icon: CornerDownLeft, family: 'end' },
  stop: { icon: CircleStop, family: 'end' },
}

export const CARDS = Object.fromEntries(Object.entries(WORDS).map(([type, words]) => [type, { ...words, ...LOOKS[type] }]))
