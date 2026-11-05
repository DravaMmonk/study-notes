/* global process */
// npm run versions — every domain's vocabulary (and every scaffold template's) kept as the version it says it is
// (vocabulary.js snapshotText, versions/<n>.json). A version printed once is never rewritten: a vocabulary that
// differs from its kept printing must say a new version, which only adds to the one before (additionProblems).
//
//   versionProblems(dir, vocabulary) → [string]   what is wrong with the versions kept in dir/versions
//   node versions.js                              writes the printing of each new version; says what is wrong
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { additionProblems, fromSnapshot, snapshotText } from './vocabulary.js'

const KIT = resolve(import.meta.dirname, '..')
const file = (dir, n) => resolve(dir, 'versions', `${n}.json`)
const read = (dir, n) => fromSnapshot(JSON.parse(readFileSync(file(dir, n), 'utf8')))

/** What is wrong with the versions of the vocabulary kept in `dir`: one missing, the current one not as kept, a version that takes something away. */
export function versionProblems(dir, vocabulary) {
  const out = []
  for (let n = 1; n <= vocabulary.version; n++) if (!existsSync(file(dir, n))) out.push(`versions/${n}.json is missing`)
  if (out.length) return out
  if (readFileSync(file(dir, vocabulary.version), 'utf8') !== snapshotText(vocabulary)) out.push(`the vocabulary is not version ${vocabulary.version} as kept: raise its version (npm run versions keeps the new one)`)
  for (let n = 1; n < vocabulary.version; n++) out.push(...additionProblems(read(dir, n), read(dir, n + 1)).map((p) => `version ${n + 1} does more than add to ${n}: ${p}`))
  return out
}

/** Every folder with a vocabulary: the domains and the scaffold's templates. */
export const vocabularyDirs = () => ['domains', 'scaffold'].flatMap((base) => readdirSync(resolve(KIT, base)).map((name) => resolve(KIT, base, name)).filter((dir) => existsSync(resolve(dir, 'vocabulary.js'))))

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  let problems = 0
  for (const dir of vocabularyDirs()) {
    const { vocabulary } = await import(resolve(dir, 'vocabulary.js'))
    if (!existsSync(file(dir, vocabulary.version))) {
      mkdirSync(resolve(dir, 'versions'), { recursive: true })
      writeFileSync(file(dir, vocabulary.version), snapshotText(vocabulary))
      console.log(`${dir}: kept version ${vocabulary.version}`)
    }
    for (const p of versionProblems(dir, vocabulary)) {
      problems += 1
      console.log(`${dir}: ${p}`)
    }
  }
  process.exit(problems ? 1 : 0)
}
