// Explicit lock updates and checked, automatically versioned package publication.
import { existsSync, mkdirSync, readdirSync, writeFileSync, readFileSync, mkdtempSync, cpSync, rmSync, symlinkSync, renameSync } from 'node:fs'
import { resolve, join } from 'node:path'
import { tmpdir } from 'node:os'
import { spawnSync, execFileSync } from 'node:child_process'
import { pathToFileURL } from 'node:url'
import { resolveLayers, contentRoot, contentTargets, packageDirectory, gameDirectory, packageIds } from './resolver.js'
import { readJSON, stableJSON, hash, contentHash, compatibility, nextVersion, kitDirectory } from './release-data.js'
import { releaseDirectory, releaseIndex, releaseSource } from './release-store.js'
import { exportedNames } from './manifests.js'
import { vocabulary } from './kernel.js'
import { OBJECT_SCHEMAS } from './objects.js'
import { OPERATIONS } from './ops/operations.js'

const write = (file, value) => writeFileSync(file, JSON.stringify(value, null, 2) + '\n')
export function lockTarget(target, root = contentRoot(), { pins } = {}) {
  const result = resolveLayers({ ...(target.kind === 'game' ? { game: target.id } : { package: target.id, closure: true }), root, unlocked: true, pins })
  for (const [id, pinned] of Object.entries(pins?.dependencies ?? {})) {
    const actual = result.identities[id]
    if (actual && (actual.version !== pinned.version || actual.hash !== pinned.hash)) throw new Error(`retained lock changed: ${id}; upgrade it explicitly`)
  }
  const missing = result.layers.filter(layer => layer.missing)
  if (missing.length || !result.lockStatus.valid) throw new Error(JSON.stringify([...missing.map(layer => ({ target: layer.id, reason: 'missing package' })), ...result.lockStatus.problems]))
  const lock = { target: target.kind === 'game' ? `@${target.id}` : target.id, dependencies: result.identities }
  const dir = (target.kind === 'game' ? gameDirectory : packageDirectory)(target.id, root)
  mkdirSync(dir, { recursive: true })
  write(resolve(dir, 'lock.json'), lock)
  return lock
}
export function upgradeTarget(target, dependency, root = contentRoot()) {
  const dir = (target.kind === 'game' ? gameDirectory : packageDirectory)(target.id, root)
  const previous = readJSON(resolve(dir, 'lock.json'))
  if (dependency && !previous.dependencies[dependency]) throw new Error(`no locked dependency ${dependency}`)
  const pins = dependency ? { ...previous, dependencies: Object.fromEntries(Object.entries(previous.dependencies).filter(([id]) => id !== dependency)) } : undefined
  const lock = lockTarget(target, root, { pins })
  checkTarget(target, root)
  return lock
}
function checkObservation(target, root, probe = false) {
  const result = spawnSync(process.execPath, [resolve(kitDirectory, 'engine/check.js'), `--${target.kind}`, target.id, '--fresh'], { cwd: resolve(kitDirectory, '../../trace-viewer'), env: { ...process.env, GAMES_ROOT: root, NODE_OPTIONS: `${process.env.NODE_OPTIONS ?? ''} --no-warnings`, GAMES_DEPENDENCY_PROBE: probe ? '1' : '0' }, encoding: 'utf8', maxBuffer: 64 << 20 })
  if (result.error || result.signal || result.status === null) throw result.error ?? new Error('check interrupted')
  return { status: result.status, stdout: result.stdout.replaceAll(root, '<project>'), stderr: result.stderr.replaceAll(root, '<project>') }
}
export function checkTarget(target, root) {
  const observation = checkObservation(target, root)
  if (observation.status) throw new Error(`${observation.stdout}\n${observation.stderr}`)
  return observation
}
export function affectedTargets(id, root) {
  const targets = [...contentTargets([], root, { game: true }), ...packageIds(root).map(id => ({ id, kind: 'package' }))]
  return targets.filter(target => !(target.kind === 'package' && target.id === id) && resolveLayers({ ...(target.kind === 'game' ? { game: target.id } : { package: target.id, closure: true }), root, unlocked: true }).layers.some(layer => layer.id === id))
}
function behaviorChanges(id, previous, targets, root) {
  if (!previous || !targets.length) return []
  const temp = mkdtempSync(join(tmpdir(), 'release-check-'))
  try {
    mkdirSync(resolve(temp, 'packages'))
    symlinkSync(gameDirectory('', root), resolve(temp, 'games'), 'dir')
    for (const packageId of packageIds(root)) {
      const source = packageDirectory(packageId, root)
      if (packageId === id || existsSync(resolve(source, 'package.json'))) symlinkSync(packageId === id ? previous : source, resolve(temp, 'packages', packageId), 'dir')
    }
    if (existsSync(releaseDirectory(root))) symlinkSync(releaseDirectory(root), resolve(temp, 'releases'), 'dir')
    return targets.flatMap(target => {
      const before = checkObservation(target, temp, true), after = checkObservation(target, root, true)
      return stableJSON(before) === stableJSON(after) ? [] : [{ ...target, before, after }]
    })
  } finally { rmSync(temp, { recursive: true, force: true }) }
}
export function platformManifest() {
  const data = { ...vocabulary }
  delete data.version
  delete data.removes
  const values = { vocabulary: data, objects: OBJECT_SCHEMAS, layout: { package: ['version', 'kernel', 'uses', 'lock.json'], game: ['kernel', 'packages', 'lock.json'], firstPackage: 'primary', range: ['exact', '^', '~'] }, operations: Object.fromEntries(Object.entries(OPERATIONS).map(([id, operation]) => [id, operation.params])), exports: { core: exportedNames(resolve(kitDirectory, 'engine/index.js')), view: exportedNames(resolve(kitDirectory, 'app/view.jsx')) } }
  return { id: 'kernel', version: readJSON(resolve(kitDirectory, 'platform.json')).version, surface: Object.fromEntries(Object.entries(values).map(([name, value]) => [name, { value, hash: hash(stableJSON(value)) }])) }
}
export function publishPlatform(root = contentRoot()) {
  const dir = releaseDirectory(root)
  mkdirSync(dir, { recursive: true })
  const index = releaseIndex(root), versions = index.kernel ?? {}
  const last = Object.keys(versions).sort((a, b) => a.localeCompare(b, 'en', { numeric: true })).at(-1)
  const before = last ? readJSON(resolve(dir, versions[last].file)) : null
  const manifest = platformManifest(), result = compatibility(before, manifest)
  manifest.version = nextVersion(last, result)
  write(resolve(dir, `kernel-${manifest.version}.json`), manifest)
  write(resolve(kitDirectory, 'platform.json'), { version: manifest.version })
  index.kernel = { ...versions, [manifest.version]: { file: `kernel-${manifest.version}.json`, hash: hash(stableJSON(manifest)) } }
  write(resolve(dir, 'index.json'), index)
  return { version: manifest.version, compatibility: result }
}
export function packageCompatibility(id, root = contentRoot()) {
  const versions = releaseIndex(root).packages[id] ?? {}
  const last = Object.keys(versions).sort((a, b) => a.localeCompare(b, 'en', { numeric: true })).at(-1)
  const before = last ? readJSON(resolve(releaseSource(id, { ...versions[last], version: last }, root), 'manifest.json')) : null
  const layer = resolveLayers({ package: id, closure: true, root }).layers.find(layer => layer.id === id)
  const result = compatibility(before, layer.manifest)
  return { ...result, previous: last ?? null, next: nextVersion(last, result), behaviorStatus: 'pending-publication', affected: affectedTargets(id, root) }
}
export function publishPackage(id, root = contentRoot()) {
  const dir = packageDirectory(id, root), configFile = resolve(dir, 'package.json')
  const config = readJSON(configFile), index = releaseIndex(root), versions = index.packages[id] ?? {}
  const last = Object.keys(versions).sort((a, b) => a.localeCompare(b, 'en', { numeric: true })).at(-1)
  const previousDir = last ? releaseSource(id, { ...versions[last], version: last }, root) : null
  const before = previousDir ? readJSON(resolve(previousDir, 'manifest.json')) : null
  const target = { kind: 'package', id }
  const validation = mkdtempSync(join(tmpdir(), 'package-contract-'))
  let contracts
  try {
    symlinkSync(packageDirectory('', root), resolve(validation, 'packages'), 'dir')
    if (existsSync(releaseDirectory(root))) symlinkSync(releaseDirectory(root), resolve(validation, 'releases'), 'dir')
    checkTarget(target, validation)
    const tests = resolve(dir, 'test')
    contracts = existsSync(tests) ? readdirSync(tests).filter(name => name.endsWith('.test.js')).map(name => resolve(tests, name)) : []
    if (existsSync(resolve(dir, 'core/index.js')) && !contracts.length) throw new Error(`${id}: code packages require contract tests`)
    if (contracts.length) execFileSync(process.execPath, ['--test', ...contracts], { cwd: resolve(kitDirectory, '../../trace-viewer'), env: { ...process.env, GAMES_ROOT: validation, NODE_OPTIONS: `${process.env.NODE_OPTIONS ?? ''} --no-warnings` }, stdio: 'pipe' })
  } finally { rmSync(validation, { recursive: true, force: true }) }
  const targets = affectedTargets(id, root)
  const result = resolveLayers({ package: id, closure: true, root })
  const current = result.layers.find(layer => layer.id === id).manifest
  const behavior = behaviorChanges(id, previousDir, targets, root)
  const comparison = compatibility(before, current, behavior)
  const version = nextVersion(last, comparison)
  const temp = mkdtempSync(join(tmpdir(), 'package-publish-'))
  try {
    // Assemble the new archive before changing the workspace or release index.
    const staged = resolve(temp, 'source')
    mkdirSync(staged)
    for (const file of Object.keys(current.files)) {
      const destination = resolve(staged, file)
      mkdirSync(resolve(destination, '..'), { recursive: true }); cpSync(resolve(dir, file), destination)
    }
    const nextConfig = { ...config, version }
    write(resolve(staged, 'package.json'), nextConfig)
    const manifest = { ...current, version, files: { ...current.files, 'package.json': hash(readFileSync(resolve(staged, 'package.json'))) }, compatibility: comparison, affected: ['breaking', 'behavior'].includes(comparison.type) ? targets : [], checks: { package: 'passed', contracts: contracts.map(file => file.slice(dir.length + 1)) } }
    manifest.hash = contentHash(manifest.files)
    write(resolve(staged, 'manifest.json'), manifest)
    const file = `${id}-${version}.zip`, archive = resolve(temp, file)
    execFileSync('zip', ['-q', '-X', archive, ...Object.keys(manifest.files).sort(), 'manifest.json'], { cwd: staged })
    const releases = releaseDirectory(root)
    mkdirSync(releases, { recursive: true })
    if (existsSync(resolve(releases, file))) throw new Error(`release already exists ${file}`)
    renameSync(archive, resolve(releases, file))
    write(configFile, nextConfig)
    index.packages[id] = { ...versions, [version]: { file, hash: manifest.hash, archiveHash: hash(readFileSync(resolve(releases, file))) } }
    write(resolve(releases, 'index.json'), index)
    return { id, version, compatibility: comparison, affected: manifest.affected, file }
  } finally { rmSync(temp, { recursive: true, force: true }) }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const [id] = process.argv.slice(2)
  console.log(JSON.stringify(id === 'kernel' ? publishPlatform() : publishPackage(id), null, 2))
}
