import { meaningsOf } from './kind-meanings.js'
import { contentSchemas } from './content.js'
// The rules every game follows, over one game's content (content.js): its content against its domain's vocabulary
// (./vocabulary.js), the course audit (../course.js), the level count on the hub (../../games.js), unique level ids
// that require only real levels, its links, and then its domain's own
// checks (reference answers pass, naive ones fail, …). npm run check (check.js) and every changeset (ops/changeset.js)
// run it.
//
// A game is checked through its spec, which its domain makes under node (the package core runtime: { vocabulary,
// spec(content), validate(spec) }): { id, domain, title, course, levels, texts?, quotes?, audit?() → [{ rule, level,
// part, text? }] }.
// `texts` are the objects whose strings a player reads (levels are always included); `quotes` the level titles that
// are also names of parts or ideas, which a text may quote (any other reference to a level, part or encyclopedia
// entry is a link, ../shell/refs.js);
// `audit` adds the game's own course problems to the shared audit's. game.json may leave findings open (`open`, the
// work list in its design doc): they are listed, not failed, and one met since fails until it is dropped.
import { REF, refProblems } from './text.js'
import { gameOf } from './games.mjs'
import { GLOSSARY, checkContent } from './vocabulary.js'
import { firstText, textEntries } from './i18n.js'
import { find } from './schema.js'
import { termRegistry } from './terminology.js'
import { noMemo } from './check-cache.js'
import { dependencyProblemsInProject } from './project-dependencies.js'
import { packageLevel } from './package-play.js'

/** Packages check objects and implementations once, then each level independently of any learning route. */
export async function checkPackage(content, { domain, root, mutants = false }) {
  const wrong = checkContent(domain, content)
  if (!wrong.length) wrong.push(...dependencyProblemsInProject(content, root))
  const lines = wrong.map(problem => ({ fail: true, text: `content: ${problem.at}: ${problem.says}`, ...(['exists', 'dependency'].includes(problem.rule) && { problem }) }))
  if (wrong.length) return lines
  const names = { level: new Map(Object.entries(content.registries.level ?? {}).map(([id, value]) => [id, String(firstText(value.title))])), wiki: new Map(Object.entries(content.registries.entry ?? {}).map(([id, value]) => [id, String(firstText(value.title))])), ...Object.assign({}, ...meaningsOf(contentSchemas.get(content)).map(meaning => meaning.textNames?.({ content, vocabulary: domain.vocabulary }))) }
  const quotes = meaningsOf(contentSchemas.get(content)).flatMap(meaning => meaning.quotes?.({ content }) ?? [])
  for (const [name, value] of Object.entries({ levels: content.levels, entries: content.glossary.entries, ...Object.assign({}, ...meaningsOf(contentSchemas.get(content)).map(meaning => meaning.texts?.({ content }))) })) {
    for (const problem of refProblems(value, name, names, quotes)) lines.push({ fail: true, text: `text ${problem}` })
  }
  for (const f of termRegistry(content.glossary).failures) lines.push({ fail: true, text: `terminology ${f.rule} ${f.at}: ${f.says}` })
  for (const level of content.levels) {
    try {
      const shell = packageLevel(content, level.id)
      const spec = domain.spec(shell)
      lines.push(...await domain.checkPhase?.({ phase: 'course', spec, content: shell }) ?? [])
      lines.push(...await domain.validate({ ...spec, memo: noMemo, mutants }))
    } catch (error) {
      lines.push({ fail: true, level: level.id, text: `${level.id}: ${error.message}` })
    }
  }
  return lines
}

/**
 * Everything checked on game `content`, as lines [{ text, fail? }]. listed: how many levels the hub says it has.
 * `domain`: its domain module (resolver.js runtimeOf). Content that does not fit the vocabulary is not built into a course: what
 * is wrong with it is all there is to say. `mutants`: also mutation reports for supported tasks. `cache`: the game's
 * kept checks (check-cache.js), which the domain's checks of an unchanged level are read from; never with `mutants`.
 */
export async function checkGame(content, { domain, listed, mutants = false, cache = null, root }) {
  if (content.packageTarget) return checkPackage(content, { domain, root, mutants })
  const lines = []
  const fail = (text) => lines.push({ fail: true, text })
  const wrong = checkContent(domain, content)
  if (!wrong.length) wrong.push(...dependencyProblemsInProject(content, root))
  for (const problem of wrong) lines.push({ fail: true, text: `content: ${problem.at}: ${problem.says}`, ...(['exists', 'dependency'].includes(problem.rule) && { problem }) })
  if (wrong.length) return lines
  for (const f of termRegistry(content.glossary).failures) fail(`terminology ${f.rule} ${f.at}: ${f.says}`)
  const spec = domain.spec(content)
  lines.push(...await domain.checkPhase?.({ phase: 'course', spec, content }) ?? [])

  if (listed != null && listed !== spec.levels.length) fail(`hub: games.js lists ${listed} levels, the game has ${spec.levels.length}`)

  const seen = new Set()
  for (const level of spec.levels) {
    if (seen.has(level.id)) fail(`${level.id}: duplicate id`)
    seen.add(level.id)
    for (const r of level.requires ?? []) if (!spec.levels.some((l) => l.id === r)) fail(`${level.id}: requires missing level ${r}`)
  }

  // References to levels, parts and entries: the names come from the game as the shell gets it.
  const game = await gameOf(content)
  const names = {
    level: new Map(game.levels.map((l) => [l.id, String(firstText(l.title))])),
    ...Object.assign({}, ...meaningsOf(contentSchemas.get(content)).map(meaning => meaning.textNames?.({ content, game, vocabulary: domain.vocabulary }))),
    wiki: new Map((game.glossary?.entries ?? []).map((e) => [e.id, String(firstText(e.title))])),
  }
  const extraTexts = Object.assign({}, ...meaningsOf(contentSchemas.get(content)).map(meaning => meaning.texts?.({ content, game })))
  // A game plays the levels its course places; the rest of its package, and the encyclopedia entries that open at them,
  // are not in it (an entry stands in its place, empty, so the problems still count entries as the file does).
  const placed = new Set(spec.levels.map((l) => l.id))
  const inGame = (entry) => !entry.at || placed.has(entry.at)
  const texts = { ...(spec.texts ?? {}), ...(spec.texts?.glossary && { glossary: spec.texts.glossary.map((entry) => (inGame(entry) ? entry : {})) }) }
  for (const [name, value] of Object.entries({ levels: spec.levels, ...texts, ...extraTexts })) for (const problem of refProblems(value, name, names, spec.quotes)) fail(`text ${problem}`)

  // An entry is linked only where it is open already: in a level it opens at or after, in an entry opening no earlier.
  // The links are read off every text of the content, by its schema, whatever its fields are called.
  const vocabulary = meaningsOf(contentSchemas.get(content)).reduce((vocabulary, meaning) => meaning.validationVocabulary?.({ vocabulary, content }) ?? vocabulary, domain.vocabulary)
  const entries = new Map((game.glossary?.entries ?? []).map((e) => [e.id, e]))
  const opensBy = (at, where) => !at || at === where || (where && spec.course.before(at, where))
  const linked = (schema, value, kind) => find(schema, value, 'text', { vocabulary })
    .flatMap(({ value }) => typeof value === 'string' ? [value] : textEntries(value).map(([, text]) => text))
    .flatMap((s) => [...s.matchAll(REF)].filter((m) => m[1] === kind).map((m) => m[2]))
  const levelLinks = (kind) => content.levels.filter(({ id }) => placed.has(id)).map(({ id, ...level }) => [id, [...new Set(linked(vocabulary.level, level, kind))]])
  for (const [id, links] of levelLinks('wiki')) for (const entry of links) if (entries.has(entry) && !opensBy(entries.get(entry).at, id)) fail(`${id} links the entry ${entry}, which opens later (at ${entries.get(entry).at})`)
  lines.push(...await domain.checkPhase?.({ phase: 'references', spec, content, game, levelLinks, opensBy }) ?? [])
  for (const entry of content.glossary.entries.filter(inGame)) for (const id of new Set(linked(GLOSSARY.fields.entries.of, entry, 'wiki'))) if (entries.has(id) && !opensBy(entries.get(id).at, entry.at)) fail(`entry ${entry.id} links the entry ${id}, which opens later (at ${entries.get(id).at})`)

  // Mutation reports are requested explicitly because providers may perform expensive checks.
  // A domain's check of one level goes through `memo` (check-cache.js), which runs it or hands back what it said last.
  const memo = cache && !mutants ? cache.memo(content, spec) : noMemo
  lines.push(...(await domain.validate({ ...spec, memo, mutants })))
  if (cache && !mutants) cache.save()
  return lines
}
