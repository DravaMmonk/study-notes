// The audit panel (DIRECTION decision 6): npm run check's lines for the game as the pending changeset leaves it,
// recomputed on every edit — the selected level's first, then every other level that fails, then the game's own —
// and what blind play says of the level (the records in games/<game>/playtests/, written by the blind-play harness:
// npm run blind). While the whole check of the latest edit is still running, the last one shows faded.
// A failing line is the check's own words; a line about a field goes to it; a level's line selects it.
import { useMemo } from 'react'
import { tr } from '../shell/i18n.js'
import { showPath } from '../engine/ops/edit.js'

/** Scroll to the field a finding is about and put the caret in it. */
const goTo = (path) => {
  const el = document.querySelector(`[data-path="${CSS.escape(showPath(path))}"]`)
  if (!el) return
  el.scrollIntoView({ block: 'center', behavior: 'smooth' })
  el.querySelector('input, textarea, select, [contenteditable="true"]')?.focus({ preventScroll: true })
}

function Line({ line, place }) {
  const kind = line.fail ? 'is-fail' : line.text.startsWith('OPEN ') ? 'is-open' : ''
  if (place?.path?.length) return <li className={`audit-line ${kind}`}><button type="button" onClick={() => goTo(place.path)}><code>{showPath(place.path)}</code> {place.says}</button></li>
  return <li className={`audit-line ${kind}`}>{line.text}</li>
}

export default function Audit({ lines, fresh, last, at, places, playtests, busy, ops, migration, onSelect, onReview }) {
  const byLevel = useMemo(() => {
    const map = new Map()
    for (const line of lines) for (const id of line.levels ?? []) map.set(id, [...(map.get(id) ?? []), line])
    return map
  }, [lines])
  const fails = lines.filter((l) => l.fail)
  const mine = at?.level ? byLevel.get(at.level) ?? [] : []
  const placeOf = (line) => places.find((p) => p.level === at?.level && p.path && line.text.endsWith(p.says))
  const others = [...byLevel].filter(([id, ls]) => id !== at?.level && ls.some((l) => l.fail))
  const game = lines.filter((l) => !l.levels?.length)
  const failedOp = last && last.failed !== null && last.failed !== undefined
  return (
    <div className={`audit ${busy || !fresh ? 'is-busy' : ''}`} aria-busy={!fresh}>
      <button type="button" className={`audit-sum ${fails.length || failedOp ? 'is-fail' : 'is-ok'}`} onClick={onReview}>
        <b>{failedOp ? tr('操作失败', 'An operation fails') : fails.length ? tr(`${fails.length} 处不过`, `${fails.length} failing`) : tr('全部通过', 'All clear')}</b>
        {(ops.length > 0 || !fresh) && <span>{!fresh ? tr('检查中', 'checking') : ''}{!fresh && ops.length ? ' · ' : ''}{ops.length ? tr(`${ops.length} 个待定操作`, `${ops.length} pending`) : ''}{migration ? ` · v${migration.version}` : ''}</span>}
      </button>
      {failedOp && <ul className="audit-lines">{last.problems.map((p) => <li key={p} className="audit-line is-fail">{p}</li>)}</ul>}
      {at?.level && (
        <section>
          <h2>{at.level}</h2>
          {mine.length > 0 && <ul className="audit-lines">{[...mine].sort((a, b) => Number(Boolean(b.fail)) - Number(Boolean(a.fail))).map((l, k) => <Line key={k} line={l} place={l.fail ? placeOf(l) : null} />)}</ul>}
          <Playtests playtests={playtests} level={at.level} />
        </section>
      )}
      {others.length > 0 && (
        <section>
          {others.map(([id, ls]) => (
            <div key={id} className="audit-level">
              <button type="button" onClick={() => onSelect({ level: id })}>{id}</button>
              <ul className="audit-lines">{ls.filter((l) => l.fail).map((l, k) => <Line key={k} line={l} />)}</ul>
            </div>
          ))}
        </section>
      )}
      {game.length > 0 && (
        <details className="audit-game" open={game.some((l) => l.fail)}>
          <summary>{tr('整款游戏', 'The game')}</summary>
          <ul className="audit-lines">{game.map((l, k) => <Line key={k} line={l} />)}</ul>
        </details>
      )}
    </div>
  )
}

/**
 * Blind play on a level (the harness's records, ../engine/play/session.js; the numbers its stats give level by level,
 * ../engine/play/stats.js): how many sessions solved it and at what cost, and each session's attempts there, what
 * the player sent and what the game said back.
 */
function Playtests({ playtests, level }) {
  const { records, levels } = playtests
  const stats = levels[level]
  if (!records.length || !stats) return null
  return (
    <div className="audit-plays">
      <b>{tr(`盲玩 ${stats.solved}/${stats.sessions} 通过 · 代价 ${stats.cost.toFixed(1)}`, `Blind play ${stats.solved}/${stats.sessions} solved · cost ${stats.cost.toFixed(1)}`)}</b>
      {records.map((r) => {
        const tries = (r.attempts ?? []).filter((a) => a.level === level)
        const outcome = r.levels.find((e) => e.level === level)
        if (!outcome) return null
        return (
          <details key={r.session} className="audit-session">
            <summary>{r.session} · {outcome.outcome} · {tr(`${outcome.attempts} 次`, `${outcome.attempts} attempt(s)`)}{outcome.hints ? ` · ${tr(`${outcome.hints} 次提示`, `${outcome.hints} hint(s)`)}` : ''}</summary>
            {tries.map((a, k) => (
              <div key={k} className={`audit-try ${a.pass ? 'is-pass' : ''}`}>
                <pre>{a.text}</pre>
                <pre className="is-says">{a.says}</pre>
              </div>
            ))}
          </details>
        )
      })}
    </div>
  )
}
