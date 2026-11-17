// The resolver owns release locations and validates immutable archives before extraction.
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { resolve, join } from 'node:path'
import { tmpdir } from 'node:os'
import { execFileSync } from 'node:child_process'
import { readJSON, hash, stableJSON, fileHashes, contentHash, satisfies, compareVersions } from './release-data.js'

export const releaseDirectory = root => resolve(process.env.GAMES_RELEASES ?? resolve(root, 'releases'))
export const releaseIndex = root => existsSync(resolve(releaseDirectory(root), 'index.json')) ? readJSON(resolve(releaseDirectory(root), 'index.json')) : { packages: {} }
export function chooseRelease(id, ranges, root, locked) {
  const versions = releaseIndex(root).packages[id] ?? {}
  const version = locked?.version ?? Object.keys(versions).filter(version => ranges.every(range => satisfies(version, range))).sort(compareVersions).at(-1)
  const entry = versions[version]
  return entry ? { ...entry, version } : null
}
const extracted = new Map()
export function releaseSource(id, entry, root) {
  if (!/^[a-z][a-z0-9-]*$/.test(id) || entry.file !== `${id}-${entry.version}.zip`) throw new Error('invalid release archive name')
  const archive = resolve(releaseDirectory(root), entry.file)
  if (hash(readFileSync(archive)) !== entry.archiveHash) throw new Error(`${id}: archive hash mismatch`)
  const key = `${archive}:${entry.archiveHash}`
  if (extracted.has(key)) return extracted.get(key)
  const names = execFileSync('unzip', ['-Z1', archive], { encoding: 'utf8' }).trim().split('\n')
  if (names.some(name => name.startsWith('/') || name.split('/').includes('..') || name.includes('\\'))) throw new Error('invalid release archive path')
  const temp = mkdtempSync(join(tmpdir(), 'game-release-'))
  try {
    const dir = resolve(temp, 'packages', id)
    mkdirSync(dir, { recursive: true })
    execFileSync('unzip', ['-q', archive, '-d', dir])
    const manifest = readJSON(resolve(dir, 'manifest.json'))
    const files = fileHashes(dir)
    if (manifest.id !== id || manifest.version !== entry.version || manifest.hash !== entry.hash || manifest.hash !== contentHash(files) || stableJSON(files) !== stableJSON(manifest.files)) throw new Error(`${id}: release content hash mismatch`)
    extracted.set(key, dir)
    return dir
  } catch (error) { rmSync(temp, { recursive: true, force: true }); throw error }
}
