// The audit panel (DIRECTION decision 6): npm run check's lines for the game as the pending changeset leaves it,
// recomputed on every edit — the selected level's first, then every other level that fails, then the game's own —
// and what blind play says of the level (the records in games/<game>/playtests/, written by the blind-play harness:
// npm run blind).
// A failing line is the check's own words; a level's line selects it.
import { useMemo } from 'react'
import { tr } from '../shell/i18n.js'

const Line = ({ line }) => <li className={`audit-line ${line.fail ? 'is-fail' : line.text.startsWith('OPEN ') ? 'is-open' : ''}`}>{line.text}</li>

export default function Audit({ shown, last, at, playtests, busy, ops, onSelect, onReview }) {
  const lines = shown.lines
  const byLevel = useMemo(() => {
    const map = new Map()
    for (const line of lines) for (const id of line.levels) map.set(id, [...(map.get(id) ?? []), line])
    return map
  }, [lines])
  const fails = lines.filter((l) => l.fail)
  const mine = at?.level ? byLevel.get(at.level) ?? [] : []
  const others = [...byLevel].filter(([id, ls]) => id !== at?.level && ls.some((l) => l.fail))
  const game = lines.filter((l) => !l.levels.length)
  const failedOp = last && last.failed !== null && last.failed !== undefined
  return (
    <div className={`audit ${busy ? 'is-busy' : ''}`}>
      <button type="button" className={`audit-sum ${fails.length || failedOp ? 'is-fail' : 'is-ok'}`} onClick={onReview}>
        <b>{failedOp ? tr('操作失败', 'An operation fails') : fails.length ? tr(`${fails.length} 处不过`, `${fails.length} failing`) : tr('全部通过', 'All clear')}</b>
        {ops.length > 0 && <span>{tr(`${ops.length} 个待定操作`, `${ops.length} pending`)}{shown.migration ? ` · v${shown.migration.version}` : ''}</span>}
      </button>
      {failedOp && <ul className="audit-lines">{last.problems.map((p) => <li key={p} className="audit-line is-fail">{p}</li>)}</ul>}
      {at?.level && (
        <section>
          <h2>{at.level}</h2>
          {mine.length ? <ul className="audit-lines">{[...mine].sort((a, b) => Number(Boolean(b.fail)) - Number(Boolean(a.fail))).map((l, k) => <Line key={k} line={l} />)}</ul> : <p className="audit-none">{tr('检查没有提到这一关。', 'The check says nothing of this level.')}</p>}
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
        <section>
          <h2>{tr('整款游戏', 'The game')}</h2>
          <ul className="audit-lines">{game.map((l, k) => <Line key={k} line={l} />)}</ul>
        </section>
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
  if (!records.length) return <p className="audit-none">{tr('还没有盲玩记录。', 'No blind play yet.')}</p>
  const stats = levels[level]
  if (!stats) return <p className="audit-none">{tr(`${records.length} 次盲玩都没有玩到这一关。`, `None of ${records.length} blind-play session(s) played this level.`)}</p>
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
