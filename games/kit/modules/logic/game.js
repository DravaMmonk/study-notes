import { loadDisplays } from '../../engine/displays.js'
// A logic game on the shared shell (../../shell), from its content (games/DESIGN.md 6.3): the course (course.js)
// becomes the shell's game description, with the logic domain's screens (a proof on the circuit editor, a truth table,
// a machine board …), its parts box of proved lemmas and built parts, and its map art.
import { symbolStamp } from './stripPieces.js'
import { CircuitBoard, Cog, Cpu, FileSignature, Grid2x2Check, Languages, ScrollText, Search, SquareFunction, Workflow } from 'lucide-react'
import { defineGame } from '../../shell/index.js'
import { fresh, introductions, isCore } from '../../course.js'
import { tr } from '../../shell/i18n.js'
import { worldCheck } from './worldValues.js'
import { query, translation } from './formulaWork.js'
import { script } from './scriptValues.js'
import { KERNEL_RULES, lemmaRules, ruleText } from './schematic.js'
import { RULES } from './proof.js'
import { logicWorks } from './work.js'
import { playKinds } from '../../shell/plays/Play.jsx'
import { iconOf as partIcon } from '../../shell/parts/icons.js'
import { OPS } from './ops.js'
import { plays } from './plays.js'
import { declaration, definition } from './rowValues.js'
import { audit } from './auditWork.js'
import { truth } from './truthValues.js'

const ui = await loadDisplays(['logic:hero', 'logic:proof-screen', 'logic:gates-screen', 'logic:machine-screen', 'logic:passed'])

// A level's declaration task, if it has one: a declaration on the rule board (iso.js).
const isoOf = (level) => level.tasks.find((t) => t.kind === 'logic:iso') ?? null
// A level that gives proof-board rules by passing it (a declaration, a generator), rather than by playing on the proof
// board.
const givesRules = (level) => !level.source.tasks.some((t) => t.kind === 'logic:proof')

/**
 * content (../../engine/content.js; vocabulary.js GAME): { id, title, kicker, lede, …the course (course.js), levels,
 * glossary }.
 */
export default function logicGame(content) {
  const logic = logicWorks(content)
  const { LEVELS, CHAPTERS, LABELS } = logic
  const { gates, lemmas, pieces } = logic
  // The parts the game defines (pieces.json's and its lemmas'), as the circuit screen draws them.
  const cards = Object.fromEntries(Object.entries(logic.defs).map(([type, d]) => [type, { name: d.name, desc: d.desc, icon: partIcon(d.icon), family: d.family }]))
  // How parts' descriptions grow along the course (the components box reads them as far as the player has got).
  const revisions = logic.revisions ?? {}
  // A built part is a proved lemma, a gate built on a truth circuit or a machine part (simp, auto…): a piece of
  // pieces.json.
  const machines = Object.fromEntries(logic.machines.map((type) => [type, pieces[type]]))
  // The course read a built piece opens on, for the components box: a gate's truth circuit; a machine part's machine
  // board, as the last task it refers to holds it; a lemma's proof of its first shape; a proved equation's task.
  const tasks = new Map(LEVELS.flatMap((L) => L.tasks).map((task) => [task.taskId, task]))
  const boardOf = (type) => {
    if (gates[type]?.built) return logic.truthCircuits
    const producer = tasks.get(logic.publishers[type]?.at(-1))
    if (machines[type] && producer) return { ...logic.machineBoards, BUILT: logic.machineBoards.forTask(producer).BUILT }
    const proof = lemmas[type] && Object.values(logic.proofs[type] ?? {})[0]
    if (proof) return { ...logic.proofBoards, BUILT: { [type]: { opens: () => ({ circuit: proof.board(), level: proof.level }) } } }
    // A proved equation, in the studio: the reference answer of the task that proves it.
    const task = logic.facts[type] && tasks.get(logic.publishers[type]?.[0])
    const boards = logic.circuitFor(task)
    return boards ? { ...boards, BUILT: { [type]: { opens: () => ({ circuit: task.solution, level: task }) } } } : null
  }
  // A part that stays where it is brought (`local`) is in no components box and unlocks nothing to show.
  const kept = ([type]) => !logic.course.local(type)
  // The parts box lists circuit pieces, each from the levels that bring it in.
  // The rules a proof-board part gives as a rule part on the machine board (the kernel's rules it is), and those a
  // lemma gives, one for each of its shapes: a shape after the first only once the player has earned it (`form`).
  const kernelRules = (type) => KERNEL_RULES.filter((r) => `logic:${r.part}` === logic.partResources[type]).map((r) => ({ text: ruleText(r) }))
  const lemmaRows = (type) => lemmaRules(type, lemmas[type]).map((r, k) => ({ text: ruleText(r), ...(k ? { form: r.key.split('.')[1] } : {}) }))
  const introduced = [...introductions(logic.course)].map(([type, at]) => {
    const text = logic.defs[type] ?? logic.strips[type] ?? pieces[type]
    const rules = kernelRules(type)
    return { key: `part:${type}`, piece: type, name: text?.name ?? type, desc: text?.desc, revisions: revisions[type], icon: cards[type]?.icon ?? partIcon(text?.icon) ?? Cpu, at, ...(rules.length ? { rules } : {}) }
  })
  const primitives = introduced.filter(({ piece }) => !logic.strips[piece])
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
    unlocks: L.unlocks,
    // A level whose boards a part runs: one that builds it, and one that proves a lemma's shape (course.js lemmaWorks).
    keeps: L.unlocks.length > 0 || logic.provers.has(L.id),
    brief: L.brief,
    after: L.after,
    // A level is its tasks (../../engine/tasks.js): the shell plays each as the level with the task's fields over it,
    // its screen reading the task as the course read it (`source`).
    tasks: L.tasks.map((t) => ({ key: t.taskId, kind: t.kind, play: t.play, step: t.step, source: t, brief: t.brief, after: t.after, carries: t.carries, intro: t.intro })),
  }))
  const game = defineGame({
    id: content.id,
    course: logic.course,
    glossary: content.glossary,
    title: content.title,
    kicker: content.kicker,
    lede: content.lede,
    Hero: ui['logic:hero'],
    chapters: CHAPTERS.map((chapter, id) => ({ id, title: chapter.title, question: chapter.question, track: chapter.track, rows: chapter.rows })),
    levels,
    levelLabel: (level) => LABELS.get(level.id) ?? String(level.index + 1),
    intro: (level) => level.source.intro,
    kinds: playKinds(plays, {
      declaration, definition, audit, truth, translation, query, script, worldCheck,
      proof: { ...ui['logic:proof-screen'], cards }, machine: { ...ui['logic:machine-screen'], cards }, gates: { ...ui['logic:gates-screen'], cards },
    }, {
      'logic:proof': { icon: Workflow, label: { zh: '证明', en: 'Proof' } },
      'logic:machine': { icon: Cog, label: { zh: '证明助手', en: 'Proof assistant' } },
      'logic:truth': { icon: Grid2x2Check, label: { zh: '真值表', en: 'Truth table' } },
      'logic:gates': { icon: Cpu, label: { zh: '真值电路', en: 'Truth circuit' } },
      'logic:iso': { icon: FileSignature, label: { zh: '规则板', en: 'Rule board' } },
      'logic:define': { icon: SquareFunction, label: { zh: '定义', en: 'Definition' } },
      'logic:translate': { icon: Languages, label: { zh: '翻译', en: 'Translate' } },
      'logic:query': { icon: Search, label: { zh: '查询', en: 'Query' } },
      'logic:model': { icon: FileSignature, label: { zh: '造世界', en: 'Build a world' } },
      'logic:script': { icon: ScrollText, label: { zh: '写脚本', en: 'Write a script' } },
    }),
    // What passing a level gives: the parts it builds, and the proof-board parts a declaration or a generator gives (its
    // rules, from here on).
    unlocked: (level) => [
      ...level.unlocks.map((flag) => flag.slice('lemma:'.length)).filter((type) => !logic.course.local(type)).map((type) => ({ piece: type, label: pieces[type].name })),
      ...(givesRules(level) ? level.source.adds : []).filter((type) => RULES[type]).map((type) => primitives.find((p) => p.piece === type)).filter(Boolean).map((p) => ({ piece: p.piece, label: p.name, icon: p.icon, family: 'logic:family-rule' })),
    ],
    passed: (level) => {
      const declared = isoOf(level.source)
      return declared ? ui['logic:passed'](declared) : null
    },
    core: (level) => isCore(logic.course, level),
    extraPieces: introduced.filter(({ piece }) => logic.strips[piece]),
    parts: {
      all: [
        ...primitives,
        ...Object.entries(gates).filter(kept).map(([type, g]) => ({ key: `lemma:${type}`, piece: type, name: g.name, desc: g.desc, icon: CircuitBoard })),
        ...Object.entries(lemmas).filter(kept).map(([type, l]) => ({ key: `lemma:${type}`, piece: type, name: l.name, desc: l.desc, revisions: revisions[type], icon: cards[type].icon, rules: lemmaRows(type) })),
        ...Object.entries(machines).filter(kept).map(([type, m]) => ({ key: `lemma:${type}`, piece: type, name: m.name, desc: m.desc, revisions: revisions[type], icon: CircuitBoard })),
      ],
      // A built piece shows the board it runs: the one the player passed its task with, else the reference.
      preview: (part, { progress }) => {
        const shown = part.piece && boardOf(part.piece)
        if (!shown) return null
        logic.syncOwn(progress?.built)
        return { inside: { course: shown, cards } }
      },
    },
    // Fewer steps (proof steps, or gates) is better; fewer cases, where the player writes them (audit-cases.js).
    better: (score, best) => Boolean(score) && (!best || score.steps < best.steps),
    bestLabel: (best) => (best.unit === 'cases' ? tr(`${best.steps} 条`, `${best.steps} cases`) : tr(`${best.steps} 步`, `${best.steps} steps`)),
  })
  game.logic = logic
  game.circuit = { forTask: (task) => logic.circuitFor(task)?.forTask(task) }
  game.stampOptions = { courseField: symbolStamp(logic.strips) }
  game.defined = { of: (type) => logic.defs[type] ?? logic.strips[type] ?? null, defaults: logic.defaultsOf, ops: OPS }
  game.workReferences = ({ task, work }) => logic.workReferences(task, work)
  return game
}
