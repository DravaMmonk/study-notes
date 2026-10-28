// A logic game on the shared shell (../../shell): its spec becomes the shell's game description, with the logic
// domain's screens (a proof on the circuit editor, a truth table), its parts box of proved lemmas and its map art.
import { Boxes, Braces, CircuitBoard, Cog, Cpu, Grid2x2Check, Languages, ScrollText, Search, Workflow } from 'lucide-react'
import './logic.css'
import { defineGame } from '../../shell/index.js'
import { fresh, introductions, isCore } from '../../course.js'
import { tr } from '../../shell/i18n.js'
import { migrations } from '../../shell/saves.js'
import GatesScreen from './ui/GatesScreen.jsx'
import Hero from './ui/Hero.jsx'
import { boardScreen } from './ui/BoardScreen.jsx'
import { MACHINE, PROOF } from './ui/boards.jsx'
import TruthScreen from './ui/TruthScreen.jsx'
import { ModelScreen } from './ui/WorldScreens.jsx'
import FormulaScreen from './ui/FormulaScreen.jsx'
import { MACHINE_TEXT, RULE_TEXT, iconOf, nameOf, textOf } from './ui/catalog.js'
import TermScreen from './ui/TermScreen.jsx'
import ScriptScreen from './ui/ScriptScreen.jsx'
import '../../strip/strip.css'
import { PRIMITIVE_GATES } from './gates.js'
import { KERNEL_RULES, lemmaRules, ruleText } from './schematic.js'

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
  // A built part is a proved lemma, a gate built on a truth circuit or a machine part (simp, auto…).
  const machines = Object.fromEntries(spec.logic.machines.map((type) => [type, RULE_TEXT[type] ?? MACHINE_TEXT[type]]))
  const built = { ...gates, ...lemmas, ...machines }
  // A part that stays where it is brought (`local`) is in no components box and unlocks nothing to show.
  const kept = ([type]) => !spec.logic.course.local(type)
  // The rules and gates the course starts from, each from the levels that bring it in.
  // The rules a proof-board part gives as a rule part on the machine board (the kernel's rules it is), and those a
  // lemma gives, one for each of its shapes: a shape after the first only once the player has earned it (`form`).
  const kernelRules = (type) => KERNEL_RULES.filter((r) => r.part === type).map((r) => ({ text: ruleText(r) }))
  const lemmaRows = (type) => lemmaRules(type, lemmas[type]).map((r, k) => ({ text: ruleText(r), ...(k ? { form: r.key.split('.')[1] } : {}) }))
  const primitives = [...introductions(spec.logic.course)].map(([type, at]) => {
    const gate = PRIMITIVE_GATES[type] ?? MACHINE_TEXT[type]
    const text = textOf(lemmas, type, revisions)
    const rules = kernelRules(type)
    return { key: `part:${type}`, name: gate?.name ?? nameOf(lemmas, type), desc: gate?.desc ?? text?.desc, revisions: gate ? revisions[type] : text?.revisions, icon: gate ? Cpu : iconOf(lemmas, type), at, ...(rules.length ? { rules } : {}) }
  })
  // A part is new in the level that first brings its idea in (`adds`); everything else carries (../../course.js reach).
  const levels = LEVELS.map((L, index) => ({
    id: L.id,
    index,
    source: L,
    // Marked 新 where its idea is met first: not a part brought in again (a part that stays where it is brought).
    fresh: L.adds.filter((p) => fresh(spec.logic.course, { id: L.id }).has(spec.logic.course.concept(p))),
    chapter: L.chapter,
    requires: L.requires,
    title: L.title,
    kind: L.kind,
    unlocks: L.unlocks,
    brief: L.brief,
    after: L.after,
    // A level of several tasks (../../shell/GameShell.jsx): what each changes of the level.
    tasks: L.tasks?.map((t) => ({ kind: t.kind, step: t.step, source: t, brief: t.brief, after: t.after, carries: t.carries, intro: t.intro })),
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
      machine: { Screen: boardScreen(MACHINE), icon: Cog, label: { zh: '证明助手', en: 'Proof assistant' } },
      truth: { Screen: TruthScreen, icon: Grid2x2Check, label: { zh: '真值表', en: 'Truth table' } },
      gates: { Screen: GatesScreen, icon: Cpu, label: { zh: '真值电路', en: 'Truth circuit' } },
      translate: { Screen: FormulaScreen, icon: Languages, label: { zh: '翻译', en: 'Translate' } },
      query: { Screen: FormulaScreen, icon: Search, label: { zh: '查询', en: 'Query' } },
      model: { Screen: ModelScreen, icon: Boxes, label: { zh: '造世界', en: 'Build a world' } },
      term: { Screen: TermScreen, icon: Braces, label: { zh: '写证明项', en: 'Write a proof term' } },
      script: { Screen: ScriptScreen, icon: ScrollText, label: { zh: '写脚本', en: 'Write a script' } },
    },
    unlocked: (level) => level.unlocks.map((flag) => flag.slice('lemma:'.length)).filter((type) => !spec.logic.course.local(type)).map((type) => ({ label: built[type].name })),
    core: (level) => isCore(spec.logic.course, level),
    parts: {
      all: [
        ...primitives,
        ...Object.entries(gates).filter(kept).map(([type, g]) => ({ key: `lemma:${type}`, name: g.name, desc: g.desc, icon: Cpu })),
        ...Object.entries(lemmas).filter(kept).map(([type, l]) => ({ key: `lemma:${type}`, name: l.name, desc: l.desc, revisions: revisions[type], icon: iconOf(lemmas, type), rules: lemmaRows(type) })),
        ...Object.entries(machines).filter(kept).map(([type, m]) => ({ key: `lemma:${type}`, name: m.name, desc: m.desc, revisions: revisions[type], icon: CircuitBoard })),
      ],
    },
    // Fewer steps (proof steps, or gates) is better.
    better: (score, best) => Boolean(score) && (!best || score.steps < best.steps),
    bestLabel: (best) => tr(`${best.steps} 步`, `${best.steps} steps`),
  })
  game.logic = spec.logic
  return game
}
