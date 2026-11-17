import { packageDirectory } from './resolver.js'
// Save/compare a migration corpus. Kept data belongs in output/, never in content or git.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { contentRoot, readContent, readPackage, runtimeOf, contentTargets, packageIds } from './resolver.js'
import { packageLevel } from './package-play.js'
import { closeGames } from './games.mjs'
import { baselineValue, imageFieldsBaseline, collectionFieldsBaseline, existenceBaseline, versionMetadataBaseline, differences, nameNormalizer, packBaseline, unpackBaseline } from './baseline-value.js'
import { taskReports } from './baseline-reports.js'
import { contentSchemas } from './content.js'
import { meaningsOf } from './kind-meanings.js'

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
    const meanings = meaningsOf(contentSchemas.get(content))
    const names = new Set()
    for (const [kind, registry] of Object.entries(content.registries)) if (!['kind', 'chapter', 'game'].includes(kind)) for (const name of Object.keys(registry)) names.add(name)
    for (const registry of Object.values(runtime.vocabulary.kinds)) for (const name of Object.keys(registry)) names.add(name)
    for (const level of content.levels) for (const task of level.tasks) names.add(task.id)
    const checked = spawnSync(process.execPath, [fileURLToPath(new URL('./check.js', import.meta.url)), ...(packaged ? ['--package'] : ['--game']), id, '--fresh'], {
      cwd: resolve(import.meta.dirname, '../../../trace-viewer'), env: { ...process.env, GAMES_ROOT: root, NODE_OPTIONS: `${process.env.NODE_OPTIONS ?? ''} --no-warnings` }, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024,
    })
    if (checked.error || checked.signal || checked.status === null) throw checked.error ?? new Error(`check interrupted: ${id}`)
    const records = []
    const scopes = packaged ? content.levels.map(level => packageLevel(content, level.id)) : [content]
    for (const scope of scopes) {
      const spec = runtime.spec(scope)
      for (const fragment of spec.specs ?? [spec]) {
        records.push({ course: { levels: fragment.course.levels, plan: fragment.course.plan, ...Object.assign({}, ...meanings.map(meaning => meaning.baselineCourse?.({ fragment }))) } })
        const reports = await taskReports(fragment, meanings)
        records.push(...reports)
        for (const meaning of meanings) records.push(...(meaning.baselineRecords?.({ fragment }) ?? []))
      }
    }
    const snapshot = baselineValue({
      format: 1, names: [...names].sort(),
      check: { status: checked.status, stdout: checked.stdout.replaceAll(root, '<project>'), stderr: checked.stderr.replaceAll(root, '<project>') },
      structure: { levels: content.levels, eras: content.eras, relations: content.relationEdges, ...Object.assign({}, ...meanings.map(meaning => meaning.baselineStructure?.({ content }))) },
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
      const changes = differences(collectionFieldsBaseline(versionMetadataBaseline(existenceBaseline(normalizeBefore(imageFieldsBaseline(oldData))))), collectionFieldsBaseline(versionMetadataBaseline(existenceBaseline(normalizeAfter(imageFieldsBaseline(newData))))))
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
