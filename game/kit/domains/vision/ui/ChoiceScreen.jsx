import { useMemo, useState } from 'react'
import { Brief, Level, RunDock, useKeptVerdict } from '../../../shell/index.js'
import { L, tr } from '../../../shell/i18n.js'
import { fromRows } from '../image.js'
import { isNaive, judgeOf } from '../judges.js'
import { render } from '../scene.js'
import ImageView, { Picture } from './ImageView.jsx'

// A choice task (../judges.js): rounds answered one after another, the first shown and each later one with changed
// data once the one before is right. A round shows what it is about — an image, the picture its candidate scenes all
// render, a reference scene, a scene the player may turn and relight (`explore`) — then its items, each with the
// options to choose from (one, or several where the judge takes several). Check asks the judge, which works out the
// answer from the round's own data, and says item by item what is wrong; a claim answered wrong that one candidate
// scene makes true and another false shows those two from a view that tells them apart (course.js `reveals`).

const KNOBS = {
  yaw: { label: { zh: '方位', en: 'Yaw' }, of: 'camera', min: -180, max: 180 },
  pitch: { label: { zh: '俯仰', en: 'Pitch' }, of: 'camera', min: -10, max: 80 },
  azimuth: { label: { zh: '光的方位', en: 'Light azimuth' }, of: 'light', min: -180, max: 180 },
  elevation: { label: { zh: '光的高度', en: 'Light elevation' }, of: 'light', min: 5, max: 90 },
}

/** An image as content writes it (rows), drawn: cell by cell while small, else as a picture. */
function Shown({ rows, value }) {
  const img = value ?? fromRows(rows)
  return img.w * img.h <= 36 ? <ImageView value={img} numbers axes /> : <Picture value={img} scale={Math.max(2, Math.floor(240 / Math.max(img.w, img.h)))} />
}

/** Why a claim is undetermined, seen: the two candidate scenes it splits, from a view that tells them apart. */
function Reveal({ round, reveal }) {
  const images = useMemo(() => reveal.scenes.map((k) => render({ ...round.scenes[k], camera: reveal.camera }).image), [round, reveal])
  return (
    <div className="vi-reveal">
      {images.map((img, j) => (
        <figure key={j}>
          <Picture value={img} scale={4} />
          <figcaption>{tr(`换个角度看场景 ${reveal.scenes[j] + 1}：${j ? '不成立' : '成立'}`, `Scene ${reveal.scenes[j] + 1} from another view: ${j ? 'fails' : 'holds'}`)}</figcaption>
        </figure>
      ))}
    </div>
  )
}

/** A scene the player turns and relights: one slider a knob the round opens. */
function Explorer({ scene, knobs }) {
  const [set, setSet] = useState({})
  const now = useMemo(() => {
    const out = { ...scene, camera: { ...scene.camera }, light: { ...scene.light } }
    for (const k of knobs) if (set[k] !== undefined) out[KNOBS[k].of][k] = set[k]
    return out
  }, [scene, knobs, set])
  const image = useMemo(() => render(now).image, [now])
  return (
    <div className="vi-explore">
      <Picture value={image} scale={6} />
      <div className="vi-knobs">
        {knobs.map((k) => (
          <label key={k} className="vi-field">
            <span>{L(KNOBS[k].label)}</span>
            <input type="range" min={KNOBS[k].min} max={KNOBS[k].max} step="1" value={now[KNOBS[k].of][k] ?? 0} onChange={(e) => setSet({ ...set, [k]: Number(e.target.value) })} />
            <output>{now[KNOBS[k].of][k] ?? 0}°</output>
          </label>
        ))}
      </div>
    </div>
  )
}

export default function ChoiceScreen({ game, level: entry, saved, save, solve, lastRun, keepRun, phone }) {
  const task = entry.source
  const { judge, params } = judgeOf(task.judge)
  const [state, setState] = useState(() => ({ round: 0, picks: task.rounds.map(() => []), ...saved }))
  const round = task.rounds[state.round]
  const picks = state.picks[state.round]
  const last = state.round === task.rounds.length - 1
  const judgeNow = () => {
    const wrong = judge.check(round, picks, params)
    return { pass: wrong.length === 0, wrong }
  }
  const [verdict, setVerdict] = useKeptVerdict({ lastRun, keepRun }, judgeNow)
  const update = (next) => {
    setState(next)
    save(next)
    setVerdict(null)
  }
  const pick = (item, id) => {
    const now = picks[item] ?? []
    const chosen = judge.multi ? (now.includes(id) ? now.filter((x) => x !== id) : [...now, id]) : [id]
    const all = round.items.map((_, k) => (k === item ? chosen : picks[k] ?? []))
    update({ ...state, picks: state.picks.map((p, r) => (r === state.round ? all : p)) })
  }
  const check = () => {
    if (verdict?.pass && !last) return update({ ...state, round: state.round + 1 })
    const v = judgeNow()
    setVerdict(v)
    if (v.pass && last) solve(null)
  }

  const sceneImages = useMemo(() => new Map(round.options.filter((o) => o.scene).map((o) => [o.id, render(o.scene).image])), [round])
  const about = (
    <div className="vi-about">
      {round.given && <p className="vi-given">{L(round.given)}</p>}
      {round.image && <Shown rows={round.image} />}
      {round.scenes && <figure><Shown value={render(round.scenes[0]).image} /><figcaption>{tr('这一轮的图', 'The picture of this round')}</figcaption></figure>}
      {round.reference && <figure><Shown value={render(round.reference).image} /><figcaption>{tr('参照', 'Reference')}</figcaption></figure>}
      {round.explore && <Explorer scene={round.explore.scene} knobs={round.explore.knobs} />}
    </div>
  )
  const wrongOf = (k) => verdict?.wrong.find((w) => w.item === k)?.why
  const items = round.items.map((it, k) => (
    <section key={k} className={`vi-item ${wrongOf(k) ? 'is-wrong' : ''}`}>
      <p className="vi-prompt">{L(it.prompt)}</p>
      <div className="vi-options" role={judge.multi ? 'group' : 'radiogroup'}>
        {round.options.map((o) => (
          <button key={o.id} type="button" className="vi-option" aria-pressed={(picks[k] ?? []).includes(o.id)} onClick={() => pick(k, o.id)}>
            {o.image && <Shown rows={o.image} />}
            {sceneImages.has(o.id) && <Picture value={sceneImages.get(o.id)} scale={3} />}
            <span>{L(o.label)}</span>
          </button>
        ))}
      </div>
      {wrongOf(k) && <p className="vi-verdict is-fail">{L(wrongOf(k))}</p>}
      {wrongOf(k) && round.reveals?.[k] && <Reveal round={round} reveal={round.reveals[k]} />}
    </section>
  ))
  const stage = (
    <div className="vi-choice">
      {task.rounds.length > 1 && <p className="vi-round">{tr(`第 ${state.round + 1} 轮，共 ${task.rounds.length} 轮`, `Round ${state.round + 1} of ${task.rounds.length}`)}</p>}
      {about}
      {items}
    </div>
  )
  // The task's naive picks, given here, are told why they are wrong (the misconception the point corrects).
  const naive = verdict && !verdict.pass && isNaive(task, state.round, picks)
  const results = verdict ? (
    <div className="vi-results">
      <p className={`vi-verdict ${verdict.pass ? 'is-pass' : 'is-fail'}`} role="status">{verdict.pass ? (last ? tr('全部答对。', 'All right.') : tr('这一轮答对了，下一轮换了数据。', 'This round is right; the next one changes the data.')) : tr(`还有 ${verdict.wrong.length} 处不对，已标出。`, `${verdict.wrong.length} still wrong, marked.`)}</p>
      {naive && <p className="vi-verdict is-fail">{L(task.naive.why)}</p>}
    </div>
  ) : null
  const go = verdict?.pass ? (last ? tr('全部答对', 'All right') : tr('下一轮', 'Next round')) : tr('检查', 'Check')
  const dock = <RunDock go={{ label: go, pass: Boolean(verdict?.pass && last), onClick: check }} />
  const brief = <Brief game={game} level={entry} hint={task.hint} phone={phone} />
  return <Level phone={phone} className="vi-choice-level" brief={brief} stage={stage} results={results} dock={dock} />
}
