/* global process */
// npm run pipeline -- <game> <command> — the agent pipeline (games/DESIGN.md 7.2) for one game: the steps in steps.js,
// their gates, and a record of every run and gate in games/<game>/pipeline.json (written only here).
//
//   status                         every step: its last gate, its runs
//   brief <step>                   the brief an agent of that step gets, with its inputs
//   run <step> [--model m] [--scope "…"] [--turns n] [--from <step>]
//                                  a fresh agent does the step (claude -p in an empty directory: Read anywhere, Write
//                                  only there, Bash only the step's commands), then the step's gate runs; --from hands
//                                  it the last report of a later step that stopped on this one's product
//   gate <step>                    run the step's gate and record it; exit 1 when it fails
//   eras                           game.json's eras as the blueprint lays them out (for the level designer)
//   terminology [--json]           read-only term registry, reference errors and literal-name review candidates
//   pedagogy                       read-only structural pedagogy findings (no pipeline state written)
//   lint                           the copy lint
//   vocab                          the domain's vocabulary and the operations, as JSON
//   resolve <k> --why "…"          mark finding k of the last review fixed (by which change)
//   queue                          every gate again; when all are clean, the game's changes go into the review queue
//   comment <at> --owner <step> --why "…"
//                                  a person's review comment (sending the game back): the next run of that step gets
//                                  it as input, and the game leaves the queue until it is queued again
import { spawnSync } from 'node:child_process'
import { chmodSync, existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import { closeGames } from '../engine/games.mjs'
import { domainOf, readContent } from '../engine/content-node.js'
import { describe } from '../engine/vocabulary.js'
import { OPERATIONS } from '../engine/ops/operations.js'
import { knownGames } from '../engine/cli-args.js'
import { erasOf } from './blueprint.js'
import { lintCopy } from './lint.js'
import { GAMES_DIR, STEPS, briefOf, pedagogyOf, stepOf, terminologyOf } from './steps.js'

const USAGE = 'npm run pipeline -- <game> (status | brief <step> | run <step> [--from <step>] | gate <step> | eras | lint | pedagogy | terminology [--json] | vocab | resolve <k> --why … | queue | comment <at> --owner <step> --why …)'
const argv = process.argv.slice(2)
const option = (name) => (argv.includes(name) ? argv[argv.indexOf(name) + 1] : undefined)
const words = argv.filter((a, k) => !a.startsWith('--') && !argv[k - 1]?.startsWith('--'))
const [game] = knownGames(words.slice(0, 1), USAGE)
const [command, arg] = words.slice(1)
const VIEWER = resolve(GAMES_DIR, '../trace-viewer')
const dir = resolve(GAMES_DIR, game)
const STATE = resolve(dir, 'pipeline.json')

const readState = () => (existsSync(STATE) ? JSON.parse(readFileSync(STATE, 'utf8')) : { game, steps: {} })
const writeState = (s) => writeFileSync(STATE, `${JSON.stringify(s, null, 2)}\n`)
const now = () => new Date().toISOString()
const seqs = () => (existsSync(resolve(dir, 'changes.jsonl')) ? readFileSync(resolve(dir, 'changes.jsonl'), 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l).seq) : [])
const stepNamed = (name) => stepOf(name) ?? (console.error(`no step ${name}; the steps are ${STEPS.map((s) => s.id).join(', ')}`), process.exit(1))

/** Run a step's gate and record it. */
async function gate(step, state) {
  const { failures, reports } = await step.gate(game, state)
  const at = state.steps[step.id] ?? (state.steps[step.id] = { runs: [], gates: [] })
  at.gates.push({ at: now(), ok: failures.length === 0, failures, reports })
  writeState(state)
  return { failures, reports }
}

const show = ({ failures, reports }, clean = 'gate clean') => {
  for (const f of failures) console.log(`FAIL ${f.rule} ${f.at}: ${f.says}`)
  for (const f of reports) console.log(`REPORT ${f.rule} ${f.at}: ${f.says}`)
  console.log(failures.length ? `${failures.length} failure(s)` : clean)
}

// The commands an agent's directory offers, each a script that runs one tool on this game and logs its exit.
const COMMANDS = {
  op: { run: () => `if [ "$1" = list ]; then node ../games/kit/engine/ops/cli.js list; else node ../games/kit/engine/ops/cli.js ${game} "$@"; fi`, about: './op --file <changeset.json> [--dry-run]   run a changeset through the operation set (./op list: the operations; ./op log: the change log)' },
  check: { run: () => `node ../games/kit/engine/check.js ${game}`, about: './check   npm run check for this game: vocabulary, course audit, copy and links, every reference / naive answer' },
  gate: { run: (step) => `node ../games/kit/pipeline/pipeline.mjs ${game} gate ${step}`, about: './gate   this step\'s gate: every failure names a rule' },
  deps: { run: () => `node ../games/kit/engine/deps.js ${game} --levels`, about: './deps   the part dependency graph (Mermaid), levels included' },
  eras: { run: () => `node ../games/kit/pipeline/pipeline.mjs ${game} eras`, about: './eras   game.json\'s eras as the blueprint lays them out' },
  lint: { run: () => `node ../games/kit/pipeline/pipeline.mjs ${game} lint`, about: './lint   the copy lint' },
  pedagogy: { run: () => `node ../games/kit/pipeline/pipeline.mjs ${game} pedagogy`, about: './pedagogy   read-only structural pedagogy findings; reports still need semantic review' },
  terminology: { run: () => `node ../games/kit/pipeline/pipeline.mjs ${game} terminology "$@"`, about: './terminology [--json]   this game\'s glossary registry, reference checks and literal-name candidates for semantic review' },
}

function inputs(step, state, scope) {
  const content = readContent(game)
  const review = state.steps.review?.runs?.at(-1)?.findings?.filter((f) => f.fix && !f.resolved && f.owner === step.id) ?? []
  const last = state.steps[step.id]?.gates?.at(-1)
  const lines = [
    `- Game: ${game} (its folder: ${dir}; domain: ${content.domain}, ${resolve(GAMES_DIR, 'kit/domains', content.domain)})`,
    `- Repository root: ${resolve(GAMES_DIR, '..')} (games/DESIGN.md is ${resolve(GAMES_DIR, 'DESIGN.md')})`,
    `- Course material: ${['DESIGN.md', 'CURRICULUM.md'].map((f) => resolve(dir, f)).filter(existsSync).join(', ') || '(none)'}`,
    // The sources the blueprint teaches from, each said to be there or not (the agent reads them; a missing one is a gap).
    ...(content.blueprint?.sources?.length ? [`- The blueprint's sources: ${content.blueprint.sources.map((f) => `${resolve(GAMES_DIR, '..', f)}${existsSync(resolve(GAMES_DIR, '..', f)) ? '' : ' (missing)'}`).join(', ')}`] : []),
    `- Blueprint: ${content.blueprint ? resolve(dir, 'blueprint.json') : '(none yet)'}`,
    `- Vocabulary: ./vocabulary.json (the domain's items and schemas, and the operations)`,
    `- The domain's part catalog: ${resolve(GAMES_DIR, 'kit/domains', content.domain, 'ui/catalog.js')}`,
    ...(scope ? [`- Scope of this run: ${scope}`] : []),
  ]
  const out = [`## Inputs\n\n${lines.join('\n')}`]
  if (last && !last.ok) out.push(`## The step's last gate failed\n\n${last.failures.map((f) => `- ${f.rule} ${f.at}: ${f.says}`).join('\n')}`)
  // A later step that hit a wall in this one's product: its report is this run's input (--from <step>).
  const from = option('--from')
  const back = from && state.steps[from]?.runs?.at(-1)
  if (back) out.push(`## What the ${from} step reported\n\nThe ${stepOf(from).role} stopped on what this step decided. Its report:\n\n${back.report}`)
  const comments = (state.review?.comments ?? []).filter((c) => c.owner === step.id && !c.done)
  if (comments.length) out.push(`## The person reviewing the game sent it back\n\n${comments.map((c) => `- ${c.at}: ${c.says}`).join('\n')}\n\nAddress each through the operation set; your report says how.`)
  if (review.length) out.push(`## Review findings for you to fix\n\n${review.map((f) => `- [${state.steps.review.runs.at(-1).findings.indexOf(f)}] ${f.at} (${f.rule}): ${f.says}`).join('\n')}\n\nFix each through the operation set; your report says which you fixed and how.`)
  out.push(`## Your commands\n\nYou may Read, Glob and Grep any file and Write only in your directory. Bash runs only these commands, each as a command of its own (no ls, cd, pipes or chains: anything else is refused, and these still work):\n\n${step.commands.map((c) => `    ${COMMANDS[c].about}`).join('\n')}`)
  return out.join('\n\n')
}

/** A fresh agent on a step, in an empty directory of its own. */
async function run(step, state) {
  if (step.who !== 'agent') {
    console.error(`the ${step.id} step is done by the ${step.who}, not by a content agent (steps.js)`)
    process.exit(1)
  }
  const model = option('--model') ?? 'claude-opus-5-5'
  const work = mkdtempSync(resolve(tmpdir(), `pipeline-${game}-${step.id}-`))
  for (const c of step.commands) {
    writeFileSync(resolve(work, c), `#!/bin/sh\nexport INIT_CWD="$(pwd)"\ncd ${JSON.stringify(VIEWER)} && ${COMMANDS[c].run(step.id)}\ns=$?\necho "${c} $s $*" >> ${JSON.stringify(resolve(work, 'calls.log'))}\nexit $s\n`)
    chmodSync(resolve(work, c), 0o755)
  }
  const content = readContent(game)
  writeFileSync(resolve(work, 'vocabulary.json'), JSON.stringify({ vocabulary: describe((await domainOf(content)).vocabulary), operations: Object.fromEntries(Object.entries(OPERATIONS).map(([k, o]) => [k, { about: o.about, params: o.params }])) }, null, 1))
  const prompt = `${briefOf(step.id)}\n\n${inputs(step, state, option('--scope'))}\n`
  writeFileSync(resolve(work, 'prompt.md'), prompt)
  const before = new Set(seqs())
  const started = Date.now()
  console.log(`${step.role}: ${model} in ${work}`)
  const tools = ['Read', `Write(/${work}/**)`, `Edit(/${work}/**)`, ...step.commands.map((c) => `Bash(./${c}:*)`)]
  const out = spawnSync('claude', ['-p', prompt, '--model', model, '--tools', 'Bash,Read,Write,Edit,Glob,Grep', '--allowedTools', ...tools, 'Glob', 'Grep', '--permission-mode', 'dontAsk', '--strict-mcp-config', '--setting-sources', '', '--no-session-persistence', '--max-turns', option('--turns') ?? '300', '--output-format', 'stream-json', '--verbose'], { cwd: work, encoding: 'utf8', maxBuffer: 1 << 28 })
  writeFileSync(resolve(work, 'transcript.jsonl'), out.stdout ?? '')
  const events = (out.stdout ?? '').split('\n').filter(Boolean).flatMap((line) => { try { return [JSON.parse(line)] } catch { return [] } })
  const result = events.find((e) => e.type === 'result') ?? {}
  const usage = result.usage ?? {}
  const tokens = ['input_tokens', 'output_tokens', 'cache_creation_input_tokens', 'cache_read_input_tokens'].reduce((n, k) => n + (usage[k] ?? 0), 0)
  const calls = existsSync(resolve(work, 'calls.log')) ? readFileSync(resolve(work, 'calls.log'), 'utf8').split('\n').filter(Boolean).map((l) => { const [tool, code, ...args] = l.split(' '); return { tool, ok: code === '0', args: args.join(' ') } }) : []
  const report = String(result.result ?? '')
  const entry = {
    at: now(),
    by: `agent:${model}`,
    usage: { tokens, seconds: Math.round((Date.now() - started) / 1000), cost: result.total_cost_usd ?? 0, turns: result.num_turns ?? null },
    calls: Object.fromEntries(step.commands.map((c) => [c, { runs: calls.filter((x) => x.tool === c).length, failed: calls.filter((x) => x.tool === c && !x.ok).length }])),
    changes: seqs().filter((s) => !before.has(s)),
    report: report.slice(0, 6000),
    transcript: resolve(work, 'transcript.jsonl'),
  }
  if (step.id === 'review') {
    const block = report.match(/```json\s*([\s\S]*?)```/)?.[1] ?? report
    try {
      entry.findings = JSON.parse(block).findings
    } catch {
      entry.findings = null
    }
  }
  for (const c of state.review?.comments ?? []) if (c.owner === step.id && !c.done) c.done = { by: entry.by, at: entry.at }
  const at = state.steps[step.id] ?? (state.steps[step.id] = { runs: [], gates: [] })
  at.runs.push(entry)
  writeState(state)
  console.log(`${calls.length} command(s) run, ${calls.filter((c) => !c.ok).length} failed; ${entry.changes.length} change(s) written; ${tokens} tokens, $${entry.usage.cost.toFixed(2)}`)
  console.log(report)
  return gate(step, state)
}

const state = readState()
let code = 0
if (command === 'status') {
  for (const step of STEPS) {
    const s = state.steps[step.id]
    const g = s?.gates?.at(-1)
    console.log(`${step.id.padEnd(10)} ${g ? (g.ok ? 'clean' : `${g.failures.length} failure(s)`) : 'no gate yet'}  ·  ${s?.runs?.length ?? 0} run(s), ${s?.gates?.length ?? 0} gate(s)${state.review && step.id === 'queue' ? `  ·  review ${state.review.status}` : ''}`)
  }
} else if (command === 'brief') {
  const step = stepNamed(arg)
  console.log(`${briefOf(step.id)}\n\n${step.who === 'agent' ? inputs(step, state, option('--scope')) : ''}`)
} else if (command === 'run') {
  const result = await run(stepNamed(arg), state)
  show(result)
  code = result.failures.length ? 1 : 0
} else if (command === 'gate') {
  const result = await gate(stepNamed(arg), state)
  show(result)
  code = result.failures.length ? 1 : 0
} else if (command === 'queue') {
  const result = await gate(stepOf('queue'), state)
  show(result)
  if (!result.failures.length) {
    state.review = { status: 'pending', at: now(), changes: seqs(), note: option('--why') ?? null, ...(state.review?.comments ? { comments: state.review.comments } : {}) }
    writeState(state)
    console.log(`in the review queue: changes ${state.review.changes.join(', ')}`)
  }
  code = result.failures.length ? 1 : 0
} else if (command === 'eras') {
  const { blueprint } = readContent(game)
  if (!blueprint) {
    console.error(`${game} has no blueprint.json`)
    code = 1
  } else console.log(JSON.stringify(erasOf(blueprint), null, 1))
} else if (command === 'terminology') {
  const result = await terminologyOf(game)
  if (argv.includes('--json')) console.log(JSON.stringify(result, null, 2))
  else {
    console.log(`${result.terms.length} registered terms; definitions are the existing entry bodies`)
    show(result, 'no registry/reference errors; terminology completeness still requires semantic review')
  }
  code = result.failures.length ? 1 : 0
} else if (command === 'pedagogy') {
  const result = await pedagogyOf(game)
  show(result, 'no structural failures; reports still require semantic review')
  code = result.failures.length ? 1 : 0
} else if (command === 'lint') {
  const found = lintCopy(readContent(game))
  for (const f of found) console.log(`FAIL ${f.rule} ${f.at}: ${f.says}`)
  console.log(found.length ? `${found.length} finding(s)` : 'copy lint clean')
  code = found.length ? 1 : 0
} else if (command === 'vocab') {
  const content = readContent(game)
  console.log(JSON.stringify({ vocabulary: describe((await domainOf(content)).vocabulary), operations: Object.keys(OPERATIONS) }, null, 1))
} else if (command === 'resolve' && arg !== undefined && option('--why')) {
  const findings = state.steps.review?.runs?.at(-1)?.findings
  if (!findings?.[Number(arg)]) {
    console.error(`the last review has no finding ${arg}`)
    code = 1
  } else {
    findings[Number(arg)].resolved = { why: option('--why'), at: now() }
    writeState(state)
  }
} else if (command === 'comment' && arg && option('--owner') && option('--why')) {
  if (!stepOf(option('--owner'))) {
    console.error(`no step ${option('--owner')}`)
    code = 1
  } else {
    const review = state.review ?? { status: 'none', changes: [] }
    state.review = { ...review, status: 'returned', comments: [...(review.comments ?? []), { at: arg, owner: option('--owner'), says: option('--why'), when: now() }] }
    writeState(state)
  }
} else {
  console.error(`usage: ${USAGE}`)
  code = 1
}
await closeGames()
process.exit(code)
