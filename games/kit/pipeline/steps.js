// The agent pipeline's steps (games/DIRECTION.md 4, games/DESIGN.md 7.2), the same for every topic: what each step
// reads and writes, who does it, the commands its agent gets, and the gate that decides it is done. Every gate's
// failure names one rule; a step's product is content written through the operation set.
//
//   blueprint  curriculum designer   writes blueprint.json            gate: the blueprint audit (blueprint.js)
//   domain     engineer (code)       resolves the blueprint's requests gate: no request open, contract, check, tests
//   levels     level designer        writes levels, eras, primitives  gate: npm run check + conformance to the blueprint
//                                                                            (but its terms) + the pedagogy lint
//   copy       copy writer           rewrites every text, glossary    gate: check + conformance (terms linked to their
//                                                                            entries) + the copy lint + the pedagogy lint
//   review     reviewer              reads it all, reports findings   gate: no finding to fix left open
//   blind      blind players         playtests/                       gate: every level played; give-ups and spikes explained;
//                                                                            reports what players say they learned against each level's point
//   queue      —                     the review queue entry           gate: every gate above still clean
import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { checkGame } from '../engine/checks.js'
import { domainOf, readContent, readPlaytests } from '../engine/content-node.js'
import { domainProblems, specProblems, validateProblems } from '../engine/contract.js'
import { perLevel, spikes } from '../engine/play/stats.js'
import { hubCount } from '../engine/ops/workspace.js'
import { auditBlueprint, conformance } from './blueprint.js'
import { lintCopy } from './lint.js'
import { lintPedagogy } from './pedagogy.js'

export const GAMES_DIR = resolve(import.meta.dirname, '../..')
const finding = (rule, at, says) => ({ rule, at, says })

/** npm run check's lines for a game, as findings (rule: check). The hub's level count is read afresh: an operation in
 *  the same run may have just changed it. */
async function checks(id) {
  const content = readContent(id)
  const listed = hubCount(readFileSync(resolve(GAMES_DIR, 'games.js'), 'utf8'), id)
  const lines = await checkGame(content, { domain: await domainOf(content), listed, playtests: readPlaytests(id) })
  return lines.filter((l) => l.fail).map((l) => finding('check', l.level ?? id, l.text))
}

/** The blueprint audit's findings split into failures and reports. */
function blueprintGate(id) {
  const { blueprint } = readContent(id)
  if (!blueprint) return { failures: [finding('bp-missing', id, 'the game has no blueprint.json')], reports: [] }
  const all = auditBlueprint(blueprint)
  return { failures: all.filter((f) => !f.report), reports: all.filter((f) => f.report) }
}

async function conformanceOf(id) {
  const content = readContent(id)
  if (!content.blueprint) return [finding('bp-missing', id, 'the game has no blueprint.json')]
  const domain = await domainOf(content)
  return conformance(content.blueprint, content, domain.spec(content))
}

/** The pedagogy lint's findings split into failures and reports. */
async function pedagogyOf(id) {
  const content = readContent(id)
  const domain = await domainOf(content)
  const all = lintPedagogy(content, domain.spec(content))
  return { failures: all.filter((f) => !f.report), reports: all.filter((f) => f.report) }
}

/**
 * What the blind players say they worked out, against the knowledge each level brings (its slot's `teaches`): a
 * level passed without a word on it, or whose words never name the point's term, may be passed without being learned.
 */
function learning(content, records) {
  const points = new Map((content.blueprint?.knowledge ?? []).map((k) => [k.id, k]))
  const teaches = new Map((content.blueprint?.eras ?? []).flatMap((e) => e.series.flatMap((x) => x.slots)).filter((s) => s.teaches).map((s) => [s.id, points.get(s.teaches)]))
  const out = []
  for (const r of records) {
    for (const e of r.levels) {
      const point = teaches.get(e.level)
      if (e.outcome !== 'solved' || !point) continue
      if (!e.learned) out.push(finding('blind-unsaid', e.level, `${r.session}: passed, and the player said nothing of what they worked out`))
      else if (![point.term.zh, point.term.en].some((term) => term && e.learned.toLowerCase().includes(String(term).toLowerCase()))) out.push(finding('blind-term', e.level, `${r.session}: “${e.learned}” never names ${point.term.en} / ${point.term.zh}`))
    }
  }
  return out
}

/** The last run of a step recorded in the game's pipeline state. */
const lastRun = (state, step) => state.steps?.[step]?.runs?.at(-1) ?? null

export const STEPS = [
  {
    id: 'blueprint',
    who: 'agent',
    role: 'curriculum designer',
    commands: ['op', 'check', 'gate'],
    gate: async (id) => blueprintGate(id),
  },
  {
    id: 'domain',
    who: 'engineer',
    role: 'engineer',
    gate: async (id) => {
      const content = readContent(id)
      const open = (content.blueprint?.requests ?? []).filter((r) => r.status === 'open').map((r) => finding('request-open', r.id, r.about.en ?? r.about))
      const domain = await domainOf(content)
      const spec = domain.spec(content)
      const contract = [...domainProblems(content.domain, domain), ...specProblems(domain, content, spec), ...(await validateProblems(domain, content, spec)).problems].map((p) => finding('contract', content.domain, p))
      const test = resolve(GAMES_DIR, 'kit/domains', content.domain, `${content.domain}.test.js`)
      const tests = []
      if (existsSync(test)) {
        try {
          const { NODE_TEST_CONTEXT: _, ...env } = process.env
          execFileSync(process.execPath, ['--test', test], { stdio: 'pipe', env })
        } catch (e) {
          tests.push(finding('domain-test', content.domain, String(e.stdout ?? e.message).split('\n').filter((l) => l.startsWith('not ok')).join('; ') || 'its unit tests fail'))
        }
      }
      return { failures: [...open, ...contract, ...tests, ...(await checks(id))], reports: [] }
    },
  },
  {
    id: 'levels',
    who: 'agent',
    role: 'level designer',
    commands: ['op', 'check', 'gate', 'deps', 'eras'],
    gate: async (id) => {
      const pedagogy = await pedagogyOf(id)
      return { failures: [...(await checks(id)), ...(await conformanceOf(id)).filter((f) => f.rule !== 'bp-term' && f.rule !== 'bp-entry'), ...pedagogy.failures], reports: pedagogy.reports }
    },
  },
  {
    id: 'copy',
    who: 'agent',
    role: 'copy writer',
    commands: ['op', 'check', 'gate', 'lint'],
    gate: async (id) => {
      const pedagogy = await pedagogyOf(id)
      return { failures: [...(await checks(id)), ...(await conformanceOf(id)), ...lintCopy(readContent(id)), ...pedagogy.failures], reports: pedagogy.reports }
    },
  },
  {
    id: 'review',
    who: 'agent',
    role: 'reviewer',
    commands: ['check', 'lint', 'deps'],
    gate: async (id, state) => {
      const run = lastRun(state, 'review')
      if (!run?.findings) return { failures: [finding('review-missing', id, 'no review has run')], reports: [] }
      const open = run.findings.filter((f) => f.fix && !f.resolved)
      return { failures: open.map((f) => finding('review', f.at, `${f.owner}: ${f.says}`)), reports: run.findings.filter((f) => !f.fix).map((f) => finding('review-note', f.at, f.says)) }
    },
  },
  {
    id: 'blind',
    who: 'blind players',
    role: 'blind player',
    gate: async (id, state) => {
      const content = readContent(id)
      const domain = await domainOf(content)
      const spec = domain.spec(content)
      const records = readPlaytests(id)
      const stats = perLevel(records)
      const explained = new Map((state.explained ?? []).map((e) => [e.level, e]))
      const failures = []
      if (!records.length) failures.push(finding('blind-none', id, 'no blind session has been played'))
      for (const l of spec.levels) {
        const s = stats.get(l.id)
        const skipped = records.some((r) => r.levels.some((e) => e.level === l.id && e.outcome === 'skipped'))
        if (!s && !skipped && records.length) failures.push(finding('blind-unplayed', l.id, 'no session played it'))
        if (s?.gaveUp && !explained.has(l.id)) failures.push(finding('blind-gave-up', l.id, `${s.gaveUp} of ${s.sessions} session(s) gave it up, and nobody has said why (npm run pipeline -- ${id} explain ${l.id} --why …)`))
      }
      for (const f of spikes(spec.course, records)) if (!explained.has(f.level)) failures.push(finding('blind-spike', f.level, `${f.text}; unexplained`))
      return { failures, reports: [...[...explained.values()].map((e) => finding('blind-explained', e.level, e.why)), ...learning(content, records)] }
    },
  },
  {
    id: 'queue',
    who: 'pipeline',
    role: 'pipeline',
    gate: async (id, state) => {
      const failures = []
      for (const step of STEPS.filter((s) => s.id !== 'queue')) {
        const { failures: f } = await step.gate(id, state)
        failures.push(...f.map((x) => ({ ...x, rule: `${step.id}:${x.rule}` })))
      }
      return { failures, reports: [] }
    },
  },
]

export const stepOf = (id) => STEPS.find((s) => s.id === id) ?? null
export const briefOf = (step) => readFileSync(resolve(import.meta.dirname, 'steps', `${step}.md`), 'utf8')
