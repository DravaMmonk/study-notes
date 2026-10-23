// A logic game on the shared shell (../../shell): its spec becomes the shell's game description, with the logic
// domain's screens (a proof on the circuit editor, a truth table), its parts box of proved lemmas and its map art.
import { Boxes, Cog, Cpu, Grid2x2Check, Languages, ScrollText, Search, Workflow } from 'lucide-react'
import './logic.css'
import { defineGame } from '../../shell/index.js'
import { introductions, isCore } from '../../course.js'
import { tr } from '../../shell/i18n.js'
import { migrations } from '../../shell/saves.js'
import GatesScreen from './ui/GatesScreen.jsx'
import Hero from './ui/Hero.jsx'
import { boardScreen } from './ui/BoardScreen.jsx'
import { MACHINE, PROOF } from './ui/boards.jsx'
import TruthScreen from './ui/TruthScreen.jsx'
import { ModelScreen, WriteScreen } from './ui/WorldScreens.jsx'
import { MACHINE_TEXT, RULE_TEXT, iconOf, nameOf, textOf } from './ui/catalog.js'
import { PRIMITIVE_GATES } from './gates.js'

/**
 * spec: { id, title, kicker, lede: { zh, en } (what the game teaches and what the player ends up building, not how many levels), logic (logicCourse's result), glossary, saves: migration steps
 * (../../shell/saves.js) }
 */
export function defineLogicGame(spec) {
  const { LEVELS, CHAPTERS, LABELS } = spec.logic
  const lemmas = LEVELS[0]?.lemmas ?? {}
  const gates = LEVELS[0]?.gates ?? {}
  // How parts' descriptions grow along the course (the components box reads them as far as the player has got).
  const revisions = spec.logic.revisions ?? {}
  // A built part is a proved lemma, a gate built on a truth circuit or a machine part (a law card, a normal form…).
  const machines = Object.fromEntries(spec.logic.machines.map((type) => [type, RULE_TEXT[type] ?? MACHINE_TEXT[type]]))
  const built = { ...gates, ...lemmas, ...machines }
  // The rules and gates the course starts from, each from the levels that bring it in.
  const primitives = [...introductions(spec.logic.course)].map(([type, at]) => {
    const gate = PRIMITIVE_GATES[type] ?? MACHINE_TEXT[type]
    const text = textOf(lemmas, type, revisions)
    return { key: `part:${type}`, name: gate?.name ?? nameOf(lemmas, type), desc: gate?.desc ?? text?.desc, revisions: gate ? revisions[type] : text?.revisions, icon: gate ? Cpu : iconOf(lemmas, type), at }
  })
  // A part is new in the level that brings it in (`adds`); everything else carries (../../course.js reach).
  const levels = LEVELS.map((L, index) => ({
    id: L.id,
    index,
    source: L,
    fresh: L.adds,
    chapter: L.chapter,
    requires: L.requires,
    title: L.title,
    kind: L.kind,
    unlocks: L.unlocks,
    brief: L.brief,
    after: L.after,
    // A level of several tasks (../../shell/GameShell.jsx): what each changes of the level.
    tasks: L.tasks?.map((t) => ({ kind: t.kind, step: t.step, source: t, brief: t.brief, after: t.after })),
  }))
  const game = defineGame({
    id: spec.id,
    glossary: spec.glossary,
    title: spec.title,
    kicker: spec.kicker,
    lede: spec.lede,
    Hero,
    html: true,
    chapters: CHAPTERS.map((chapter, id) => ({ id, title: chapter.title, question: chapter.question, track: chapter.track })),
    levels,
    progress: migrations(spec.saves ?? []),
    levelLabel: (level) => LABELS.get(level.id) ?? String(level.index + 1),
    intro: (level) => level.source.intro,
    kinds: {
      proof: { Screen: boardScreen(PROOF), icon: Workflow, label: { zh: '证明', en: 'Proof' } },
      machine: { Screen: boardScreen(MACHINE), icon: Cog, label: { zh: '机器', en: 'Machine' } },
      truth: { Screen: TruthScreen, icon: Grid2x2Check, label: { zh: '真值表', en: 'Truth table' } },
      gates: { Screen: GatesScreen, icon: Cpu, label: { zh: '真值电路', en: 'Truth circuit' } },
      translate: { Screen: WriteScreen, icon: Languages, label: { zh: '翻译', en: 'Translate' } },
      query: { Screen: WriteScreen, icon: Search, label: { zh: '查询', en: 'Query' } },
      model: { Screen: ModelScreen, icon: Boxes, label: { zh: '造世界', en: 'Build a world' } },
      prolog: { Screen: WriteScreen, icon: ScrollText, label: { zh: '写规则', en: 'Write rules' } },
    },
    unlocked: (level) => level.unlocks.map((flag) => ({ label: built[flag.slice('lemma:'.length)].name })),
    core: (level) => isCore(spec.logic.course, level),
    parts: {
      all: [
        ...primitives,
        ...Object.entries(gates).map(([type, g]) => ({ key: `lemma:${type}`, name: g.name, desc: g.desc, icon: Cpu })),
        ...Object.entries(lemmas).map(([type, l]) => ({ key: `lemma:${type}`, name: l.name, desc: l.desc, revisions: revisions[type], icon: iconOf(lemmas, type) })),
        ...Object.entries(machines).map(([type, m]) => ({ key: `lemma:${type}`, name: m.name, desc: m.desc, revisions: revisions[type], icon: Cog })),
      ],
    },
    // Fewer steps (proof steps, or gates) is better.
    better: (score, best) => Boolean(score) && (!best || score.steps < best.steps),
    bestLabel: (best) => tr(`${best.steps} 步`, `${best.steps} steps`),
  })
  game.logic = spec.logic
  return game
}
