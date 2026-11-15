// A logic game on the shared shell (../../shell), from its content (games/DESIGN.md 6.3): the course (course.js)
// becomes the shell's game description, with the logic domain's screens (a proof on the circuit editor, a truth table,
// a machine board …), its parts box of proved lemmas and built parts, and its map art.
import { Braces, CircuitBoard, Cog, Cpu, FileSignature, Grid2x2Check, Languages, ScrollText, Search, SquareFunction, Workflow } from 'lucide-react'
import './logic.css'
import { bindPlays } from '../../shell/plays.js'
import { plays, playIdOf } from './plays.js'
import { defineGame } from '../../shell/index.js'
import { fresh, introductions, isCore } from '../../course.js'
import { tr } from '../../shell/i18n.js'
import GatesScreen, { GateInside } from './ui/GatesScreen.jsx'
import RowsPlay from '../../shell/RowsPlay.jsx'
import { casesScreen } from '../../shell/CasesPlay.jsx'
import { rowJudgeOf } from './playJudges.js'
import { rows } from './ui/rows.jsx'
import { declarationAudit } from './ui/declarationAudit.jsx'
import DeclaredRules from './ui/DeclaredRules.jsx'
import Hero from './ui/Hero.jsx'
import BoardScreen from './ui/BoardScreen.jsx'
import TruthScreen from './ui/TruthScreen.jsx'
import { ModelScreen } from './ui/WorldScreens.jsx'
import FormulaScreen from './ui/FormulaScreen.jsx'
import { iconOf, nameOf, textOf } from './ui/catalog.js'
import { MACHINE_TEXT, RULE_TEXT } from './partText.js'
import TermScreen from './ui/TermScreen.jsx'
import ScriptScreen from './ui/ScriptScreen.jsx'
import '../../strip/strip.css'
import { PRIMITIVE_GATES } from './gates.js'
import { KERNEL_RULES, lemmaRules, ruleText } from './schematic.js'
import { RULES } from './proof.js'
import { logicCourse } from './course.js'

// A level's declaration task, if it has one: a declaration on the rule board (iso.js).
const isoOf = (level) => level.tasks.find((t) => t.kind === 'iso') ?? null
// A level that gives proof-board rules by passing it (a declaration, a generator), rather than by playing on the proof
// board.
const givesRules = (level) => !level.source.tasks.some((t) => t.kind === 'proof')

function LogicRows(props) {
  return <RowsPlay {...props} adapter={rows[props.play.editor]} judge={rowJudgeOf} />
}

const playScreens = bindPlays(plays, {
  circuit: BoardScreen, truthTable: TruthScreen, truthCircuit: GatesScreen,
  rows: LogicRows, boardCases: casesScreen(declarationAudit), formula: FormulaScreen, world: ModelScreen,
  term: TermScreen, script: ScriptScreen,
}, {
  proof: Workflow, machine: Cog, truth: Grid2x2Check, gates: Cpu, rules: FileSignature, function: SquareFunction,
  translate: Languages, query: Search, term: Braces, script: ScrollText,
})

/**
 * content (../../engine/content.js; vocabulary.js GAME): { id, title, kicker, lede, …the course (course.js), levels,
 * glossary }.
 */
export default function logicGame(content) {
  const logic = logicCourse(content)
  const { LEVELS, CHAPTERS, LABELS } = logic
  const lemmas = content.lemmas ?? {}
  const { gates } = logic
  // How parts' descriptions grow along the course (the components box reads them as far as the player has got).
  const revisions = logic.revisions ?? {}
  // A built part is a proved lemma, a gate built on a truth circuit or a machine part (simp, auto…).
  const machines = Object.fromEntries(logic.machines.map((type) => [type, RULE_TEXT[type] ?? MACHINE_TEXT[type]]))
  const built = { ...gates, ...lemmas, ...machines }
  // A part that stays where it is brought (`local`) is in no components box and unlocks nothing to show.
  const kept = ([type]) => !logic.course.local(type)
  // The rules and gates the course starts from, each from the levels that bring it in.
  // The rules a proof-board part gives as a rule part on the machine board (the kernel's rules it is), and those a
  // lemma gives, one for each of its shapes: a shape after the first only once the player has earned it (`form`).
  const kernelRules = (type) => KERNEL_RULES.filter((r) => r.part === type).map((r) => ({ text: ruleText(r) }))
  const lemmaRows = (type) => lemmaRules(type, lemmas[type]).map((r, k) => ({ text: ruleText(r), ...(k ? { form: r.key.split('.')[1] } : {}) }))
  const primitives = [...introductions(logic.course)].map(([type, at]) => {
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
    fresh: L.adds.filter((p) => fresh(logic.course, { id: L.id }).has(logic.course.concept(p))),
    chapter: L.chapter,
    requires: L.requires,
    title: L.title,
    kind: L.kind,
    playId: playIdOf(L),
    unlocks: L.unlocks,
    // A level whose boards a part runs: one that builds it, and one that proves a lemma's shape (course.js lemmaReferences).
    keeps: L.unlocks.length > 0 || logic.provers.has(L.id),
    brief: L.brief,
    after: L.after,
    // A level is its tasks (../../engine/tasks.js): the shell plays each as the level with the task's fields over it,
    // its screen reading the task as the course read it (`source`).
    tasks: L.tasks.map((t) => ({ key: t.taskId, kind: t.kind, playId: playIdOf(t), step: t.step, source: t, brief: t.brief, after: t.after, carries: t.carries, intro: t.intro })),
  }))
  const game = defineGame({
    id: content.id,
    glossary: content.glossary,
    title: content.title,
    kicker: content.kicker,
    lede: content.lede,
    Hero,
    chapters: CHAPTERS.map((chapter, id) => ({ id, title: chapter.title, question: chapter.question, track: chapter.track })),
    levels,
    levelLabel: (level) => LABELS.get(level.id) ?? String(level.index + 1),
    intro: (level) => level.source.intro,
    plays: playScreens,
    // What passing a level gives: the parts it builds, and the proof-board parts a declaration or a generator gives (its
    // rules, from here on).
    unlocked: (level) => [
      ...level.unlocks.map((flag) => flag.slice('lemma:'.length)).filter((type) => !logic.course.local(type)).map((type) => ({ label: built[type].name })),
      ...(givesRules(level) ? level.source.adds : []).filter((type) => RULES[type]).map((type) => primitives.find((p) => p.key === `part:${type}`)).filter(Boolean).map((p) => ({ label: p.name, icon: p.icon, family: 'rule' })),
    ],
    passed: (level) => {
      const declared = isoOf(level.source)
      return declared ? <DeclaredRules level={declared} /> : null
    },
    core: (level) => isCore(logic.course, level),
    parts: {
      all: [
        ...primitives,
        ...Object.entries(gates).filter(kept).map(([type, g]) => ({ key: `lemma:${type}`, name: g.name, desc: g.desc, icon: CircuitBoard })),
        ...Object.entries(lemmas).filter(kept).map(([type, l]) => ({ key: `lemma:${type}`, name: l.name, desc: l.desc, revisions: revisions[type], icon: iconOf(lemmas, type), rules: lemmaRows(type) })),
        ...Object.entries(machines).filter(kept).map(([type, m]) => ({ key: `lemma:${type}`, name: m.name, desc: m.desc, revisions: revisions[type], icon: CircuitBoard })),
      ],
      // A gate the player built shows the board it runs: the one the player passed its level with.
      demo: (part, { progress }) => {
        const type = part.key.slice('lemma:'.length)
        if (!gates[type]?.built) return null
        logic.syncOwn(progress.built)
        return <GateInside key={part.key} type={type} gates={gates} />
      },
    },
    // Fewer steps (proof steps, or gates) is better; fewer cases, where the player writes them (iso.js judgeCases).
    better: (score, best) => Boolean(score) && (!best || score.steps < best.steps),
    bestLabel: (best) => (best.unit === 'cases' ? tr(`${best.steps} 条`, `${best.steps} cases`) : tr(`${best.steps} 步`, `${best.steps} steps`)),
  })
  game.logic = logic
  game.workReferences = (entry, built) => {
    logic.syncOwn(built)
    return logic.workReferences(entry.task, entry.work)
  }
  return game
}
