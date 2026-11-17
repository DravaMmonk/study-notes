import { packageDirectory } from './resolver.js'
// Save/compare a migration corpus. Kept data belongs in output/, never in content or git.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { contentRoot, readContent, readPackage, runtimeOf, contentTargets, packageIds } from './resolver.js'
import { packageLevel } from './package-play.js'
import { closeGames } from './games.mjs'
import { baselineValue, existenceBaseline, differences, nameNormalizer, packBaseline, unpackBaseline } from './baseline-value.js'
import { taskReports } from './baseline-reports.js'
import { usable, offer, holds } from '../course.js'

const root = contentRoot()
const folder = resolve(root, 'output/modules-baseline')
const preview = value => value && typeof value === 'object' ? (Array.isArray(value) ? `[${value.length} items]` : `{${Object.keys(value).slice(0, 4).join(', ')}}`) : JSON.stringify(value)
const [action, ...args] = process.argv.slice(2)
if (!['save', 'compare'].includes(action)) throw new Error('usage: npm run baseline -- save|compare [<game>|--package <package>]')
const asPackage = args.includes('--package')
const ids = args.filter(arg => arg !== '--package')
const targets = ids.length || asPackage ? contentTargets(ids, root, { package: asPackage })
  : [...contentTargets([], root, { game: true }), ...packageIds(root).map(id => ({ id, kind: 'package' }))]
mkdirSync(folder, { recursive: true })
let total = 0
try {
  for (const target of targets) {
    const { id, kind } = target
    const packaged = kind === 'package'
    if (action === 'compare' && packaged && !existsSync(resolve(folder, `${kind}-${id}.json`)) && existsSync(resolve(packageDirectory(id, root), 'core/index.js'))) {
      console.log(`compare package ${id}: new plugin outside the locked corpus (covered by package contracts)`)
      continue
    }
    const content = (packaged ? readPackage : readContent)(id, root)
    const runtime = await runtimeOf(content)
    const names = new Set()
    for (const [kind, registry] of Object.entries(content.registries)) if (kind !== 'kind') for (const name of Object.keys(registry)) names.add(name)
    for (const registry of Object.values(runtime.vocabulary.kinds)) for (const name of Object.keys(registry)) names.add(name)
    for (const level of content.levels) for (const task of level.tasks) names.add(task.id)
    const checked = spawnSync(process.execPath, [fileURLToPath(new URL('./check.js', import.meta.url)), ...(packaged ? ['--package'] : ['--game']), id, '--fresh'], {
      cwd: resolve(import.meta.dirname, '../../../trace-viewer'), env: { ...process.env, GAMES_ROOT: root, NODE_OPTIONS: '--no-warnings' }, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024,
    })
    if (checked.error || checked.signal || checked.status === null) throw checked.error ?? new Error(`check interrupted: ${id}`)
    const records = []
    const scopes = packaged ? content.levels.map(level => packageLevel(content, level.id)) : [content]
    for (const scope of scopes) {
      const spec = runtime.spec(scope)
      for (const fragment of spec.specs ?? [spec]) {
        records.push({ course: { levels: fragment.course.levels, plan: fragment.course.plan, publications: fragment.course.publications, stages: fragment.course.stages } })
        const reports = await taskReports(fragment)
        records.push(...reports)
        // Order and identity are data. Do not serialize runtime closures or caches.
        for (const level of fragment.levels) {
          const works = fragment.table ?? fragment.image ?? fragment.logic ?? fragment.circuit ?? {}
          const tasks = works.played?.get(level.id) ?? level.tasks
          for (const task of tasks) {
            const at = { id: level.id, task: task.task }
            const course = fragment.course
            const ancestors = course.levels.filter(prior => course.before(prior.id, level.id))
            const flags = new Set(ancestors.flatMap(prior => [...(prior.unlocks ?? []), ...course.opens(prior), ...course.awards(prior)]))
            for (const flag of [...course.opens(at), ...course.awards(at)]) flags.add(flag)
            const holding = holds(course, at, flags)
            records.push({ level: level.id, task: task.taskId ?? task.key ?? task.id, availability: {
              usable: usable(course, at, flags), emptyProgress: usable(course, at, new Set()), gives: course.gives(at), opens: course.opens(at), awards: course.awards(at),
              tray: offer(course, at, flags),
              definitions: Object.fromEntries(usable(course, at, flags).map(type => [type, holding.definition(type)])),
            } })
          }
        }
      }
    }
    const snapshot = baselineValue({
      format: 1, names: [...names].sort(),
      check: { status: checked.status, stdout: checked.stdout.replaceAll(root, '<project>'), stderr: checked.stderr.replaceAll(root, '<project>') },
      structure: { levels: content.levels, eras: content.eras, relations: content.relationEdges, parts: content.partDefs, ...(Object.keys(content.registries.symbol ?? {}).length && { symbols: content.registries.symbol }), trays: content.trays },
      records,
    })
    const file = resolve(folder, `${kind}-${id}.json`)
    let changeCount = 0
    if (action === 'save') writeFileSync(file, JSON.stringify(packBaseline(snapshot)) + '\n')
    else {
      const before = unpackBaseline(JSON.parse(readFileSync(file, 'utf8')))
      const normalizeBefore = nameNormalizer(before.names), normalizeAfter = nameNormalizer(snapshot.names)
      // The inventory itself describes migration locations, not behaviour.
      const { names: _old, ...oldData } = before, { names: _new, ...newData } = snapshot
      const changes = differences(existenceBaseline(normalizeBefore(oldData)), existenceBaseline(normalizeAfter(newData)))
      changeCount = changes.length
      total += changeCount
      writeFileSync(resolve(folder, `${kind}-${id}.diff.json`), JSON.stringify(packBaseline(changes)) + '\n')
      for (const change of changes.slice(0, 30)) console.log(`${kind} ${id} ${change.path}: ${preview(change.before)} -> ${preview(change.after)}`)
      if (changes.length > 30) console.log(`  ${changes.length - 30} more differences in output/modules-baseline/${kind}-${id}.diff.json`)
    }
    console.log(`${action} ${kind} ${id}: ${content.levels.length} levels, ${content.levels.reduce((n, l) => n + l.tasks.length, 0)} tasks, ${records.length} records${action === 'compare' ? `, ${changeCount} differences` : ''}`)
  }
} finally { await closeGames() }
if (action === 'compare') console.log(`${total} differences`)
process.exitCode = total ? 1 : 0
