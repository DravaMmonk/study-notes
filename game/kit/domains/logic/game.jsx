// A logic game on the shared shell (../../shell): its spec becomes the shell's game description, with the logic
// domain's screens (a proof on the circuit editor, a truth table), its parts box of proved lemmas and its map art.
import { Grid2x2Check, Workflow } from 'lucide-react'
import './logic.css'
import { defineGame } from '../../shell/index.js'
import { tr } from '../../shell/i18n.js'
import Hero from './ui/Hero.jsx'
import ProofScreen from './ui/ProofScreen.jsx'
import TruthScreen from './ui/TruthScreen.jsx'
import { iconOf } from './ui/catalog.js'

/** spec: { id, title, kicker, lede: (count) → { zh, en }, logic (logicCourse's result), glossary } */
export function defineLogicGame(spec) {
  const { LEVELS, CHAPTERS, LABELS } = spec.logic
  const lemmas = LEVELS[0]?.lemmas ?? {}
  // A part is new where it is first offered in play order.
  const offered = new Set()
  const levels = LEVELS.map((L, index) => {
    const fresh = L.palette.filter((p) => !offered.has(p))
    L.palette.forEach((p) => offered.add(p))
    return {
      id: L.id,
      index,
      source: L,
      fresh,
      chapter: L.chapter,
      requires: L.requires,
      title: L.title,
      kind: L.kind,
      unlocks: L.unlocks,
      brief: L.brief,
      after: L.after,
    }
  })
  const game = defineGame({
    id: spec.id,
    glossary: spec.glossary,
    title: spec.title,
    kicker: spec.kicker,
    lede: spec.lede(LEVELS.length),
    Hero,
    html: true,
    chapters: CHAPTERS.map((chapter, id) => ({ id, title: chapter.title, question: chapter.question, track: chapter.track })),
    levels,
    progress: { version: 1 },
    levelLabel: (level) => LABELS.get(level.id) ?? String(level.index + 1),
    intro: (level) => level.source.intro,
    kinds: {
      proof: { Screen: ProofScreen, icon: Workflow, label: { zh: '证明', en: 'Proof' } },
      truth: { Screen: TruthScreen, icon: Grid2x2Check, label: { zh: '真值表', en: 'Truth table' } },
    },
    unlocked: (level) => level.unlocks.map((flag) => ({ label: lemmas[flag.slice('lemma:'.length)].name })),
    parts: {
      all: Object.entries(lemmas).map(([type, l]) => ({ key: `lemma:${type}`, name: l.name, desc: l.desc, icon: iconOf(lemmas, type) })),
      earned: (progress) => progress.flags,
    },
    // Fewer steps is a better proof.
    better: (score, best) => Boolean(score) && (!best || score.steps < best.steps),
    bestLabel: (best) => tr(`${best.steps} 步`, `${best.steps} steps`),
  })
  game.logic = spec.logic
  return game
}
