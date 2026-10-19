import { Fragment, useState } from 'react'
import { Check, Circle, EyeOff, Play, X } from 'lucide-react'
import { L, keyOf, tr } from '../../../../games/kit/shell/i18n.js'
import ImageView from './ImageView.jsx'
import { rangeOf } from './display.js'
import CurveView from './views/CurveView.jsx'
import ProfileView from './views/ProfileView.jsx'
import ValueView, { NumberCompare } from './views/ValueView.jsx'
import ViewSwitch from './views/ViewSwitch.jsx'
import { kindOf, rowOf } from './views/views.js'

// The test panel: every test as a chip, and the chosen test laid out as input → expected / actual / error.
// Numbers are compared on a scale, waveforms as one plot with the allowed band, 2-D values side by
// side in the same view as their cards on the board (switching here switches the cards too), with
// a pixel map of the misses. In the profile view the two rows are laid over each other.
// `part` splits it for a desktop circuit (games/kit/shell/CircuitLayout.jsx): 'tests' is the chips in the strip's
// header, 'verdict' (once run) and 'views' the strip pane's head, and 'row' the inputs, then expected / yours / error for each
// output, side by side; 'readout' reads the spot under the pointer (probe / onProbe, shared by all the parts).
export default function TestPanel({ level, run, onTest, hiddenCount = 0, hiddenMiss, testIndex, onSelect, sensors, inView, outView, onView, scan, onScan, theme, part, probe: sharedProbe, onProbe }) {
  const [ownProbe, setOwnProbe] = useState(null)
  const probe = onProbe ? sharedProbe : ownProbe
  const setProbe = onProbe ?? setOwnProbe
  const test = level.tests[testIndex]
  const result = run?.results[testIndex]
  const passed = run?.results.filter((r) => r.pass).length ?? 0
  const all = level.tests.length
  const inputsAreImages = Object.values(test.inputs).some((img) => kindOf(img) === 'image')
  const outputsAreImages = Object.values(test.expected).some((img) => kindOf(img) === 'image')
  const tolerance = (test.check ?? level.check)?.tolerance ?? 0.02
  const many = Object.keys(test.expected).length > 1

  const head = (
    <header className="panel-head">
      <span>{tr('测试', 'Tests')}</span>
      {run?.untested ? (
        <span className="tests-meter is-untested">{tr('还没测试', 'Not tested yet')}</span>
      ) : (
        <span className={`tests-meter ${run?.pass ? 'is-pass' : ''}`} aria-label={tr(`${passed} / ${all} 通过`, `${passed} / ${all} passed`)}>
          {level.tests.map((t, index) => <i key={keyOf(t.label)} className={run?.results[index]?.pass ? 'is-on' : ''} />)}
          <b>{passed}/{all}</b>
        </span>
      )}
    </header>
  )
  const runButton = onTest && <button className={`run-tests ${run?.pass && !hiddenMiss ? 'is-pass' : ''}`} onClick={onTest}>{run?.pass && !hiddenMiss ? <Check size={15} /> : <Play size={14} />}{run?.pass && !hiddenMiss ? tr('全部通过 · 再测一次', 'All passed · run again') : tr('运行测试', 'Run tests')}</button>
  const hiddenNote = hiddenMiss ? (
    <p className="hidden-note is-fail"><X size={13} />{tr(`下面的测试都通过了，但 ${hiddenMiss.total} 组隐藏测试里有 ${hiddenMiss.failed} 组没过：电路可能只对这几张图凑巧成立。`, `Every test below passes, but ${hiddenMiss.failed} of ${hiddenMiss.total} hidden tests fail: the circuit may only happen to work on these pictures.`)}</p>
  ) : hiddenCount > 0 ? (
    <p className="hidden-note"><EyeOff size={13} />{tr(`另有 ${hiddenCount} 组隐藏测试，运行测试时一起检查，通关后公开。`, `${hiddenCount} more hidden ${hiddenCount === 1 ? 'test is' : 'tests are'} checked with every run and shown once you pass.`)}</p>
  ) : null
  const list = (
    <ol className="test-list">
      {level.tests.map((t, index) => {
        const ok = run?.results[index]?.pass
        return (
          <li key={keyOf(t.label)}>
            <button className={`test-row ${index === testIndex ? 'is-active' : ''} ${ok === null ? '' : ok ? 'is-pass' : 'is-fail'}`} onClick={() => onSelect(index)} aria-pressed={index === testIndex}>
              {ok === null ? <Circle size={11} /> : ok ? <Check size={13} /> : <X size={13} />}
              <span>{L(t.label)}</span>
              {t.hidden && <em className="hidden-tag">{tr('隐藏', 'hidden')}</em>}
            </button>
          </li>
        )
      })}
    </ol>
  )
  const inputFigures = Object.entries(test.inputs).map(([name, img]) => (
    <figure key={name} className={kindOf(img) === 'signal' ? 'is-wide' : ''}>
      <ValueView img={img} view={inView} size={kindOf(img) === 'image' ? 132 : 280} theme={theme} onHover={setProbe} scan={scan} onScan={onScan} grid />
      <figcaption>{L(sensors?.[name]?.label) ?? tr('输入', 'Input')}</figcaption>
    </figure>
  ))
  // What came out against what was expected, for one output: a scale, a plot, or three pictures.
  const outputFigures = (name, expected) => {
    const actual = result?.outputs[name]
    const check = result?.checks.find((c) => c.name === name)
    const kind = kindOf(expected)
    const fits = actual?.w === expected.w && actual?.h === expected.h
    const label = L(level.outputLabels?.[name]) ?? name
    const prefix = many ? `${label} · ` : ''
    if (kind === 'number') {
      return (
        <figure className="is-wide">
          <NumberCompare expected={expected.data[0]} actual={fits ? actual.data[0] : NaN} tolerance={tolerance} pass={check?.pass} />
          {many && <figcaption>{label}</figcaption>}
        </figure>
      )
    }
    if (kind === 'signal') {
      return (
        <figure className="test-curve">
          <CurveView img={fits ? actual : null} expected={expected} tolerance={tolerance} width={280} height={120} onHover={setProbe} />
          <figcaption>{prefix}<i className="is-expected" />{tr('期望', 'expected')} <i className="is-band" />{tr('允许范围', 'allowed band')} <i />{tr('你的输出', 'your output')}</figcaption>
        </figure>
      )
    }
    return <OutputImages expected={expected} actual={actual} fits={fits} view={outView} tolerance={tolerance} theme={theme} onHover={setProbe} scan={scan} onScan={onScan} prefix={prefix} />
  }
  const verdictOf = (checks) => {
    if (!checks.length || checks.some((c) => c?.pass === null || c?.pass === undefined)) return <p className="test-verdict">{tr('点「运行测试」看这组是否通过', 'Press Run tests to see whether this one passes')}</p>
    const failed = checks.find((c) => !c.pass)
    return (
      <p className={`test-verdict ${failed ? 'is-fail' : 'is-pass'}`}>
        {failed ? <X size={14} /> : <Check size={14} />}
        {failed ? L(failed.reason) || tr('未通过', 'Not passed') : tr('这组通过', 'Passed')}
      </p>
    )
  }
  const checkOf = (name) => result?.checks.find((c) => c.name === name)
  const inputs = (
    <div className="test-block">
      <div className="test-block-head">
        <span className="test-block-label">{tr('输入', 'Input')}</span>
        {inputsAreImages && <ViewSwitch value={inView} onChange={(v) => onView(['input'], v)} shows={level.shows} fresh={level.freshViews} compact />}
      </div>
      <div className={`test-images is-inputs ${inputsAreImages ? '' : 'is-wide'}`}>{inputFigures}</div>
    </div>
  )
  const outputs = Object.entries(test.expected).map(([name, expected]) => {
    const check = checkOf(name)
    const kind = kindOf(expected)
    return (
      <div key={name} className={`test-block ${check?.pass === null ? '' : check?.pass ? 'is-pass' : 'is-fail'}`}>
        <div className="test-block-head">
          <span className="test-block-label">{tr('输出', 'Output')}</span>
          {kind === 'image' && <ViewSwitch value={outView} onChange={(v) => onView(['output'], v)} shows={level.shows} fresh={level.freshViews} compact />}
        </div>
        {kind === 'image' ? <div className="test-images">{outputFigures(name, expected)}</div> : outputFigures(name, expected)}
        {verdictOf([check])}
      </div>
    )
  })
  // One switch for the whole row: it sets the inputs' and the outputs' view together.
  const roles = [inputsAreImages && 'input', outputsAreImages && 'output'].filter(Boolean)
  // The spot under the pointer, read out on every picture of the test: each input, then what was expected and what
  // came out. Pictures of other sizes are read at the same place in proportion; a spectrum reads only its own cell.
  // A picture of another size than the one pointed at says which of its own cells it read.
  const valueAt = (img) => {
    if (!img) return null
    const x = Math.min(img.w - 1, Math.floor(((probe.x + 0.5) * img.w) / probe.w))
    const y = Math.min(img.h - 1, Math.floor(((probe.y + 0.5) * img.h) / probe.h))
    return { value: img.data[y * img.w + x], at: img.w === probe.w && img.h === probe.h ? '' : ` (${x}, ${y})` }
  }
  const readings = probe && !probe.frequency && probe.w
    ? [
        ...Object.entries(test.inputs).map(([name, img]) => [L(sensors?.[name]?.label) ?? tr('输入', 'Input'), valueAt(img)]),
        ...Object.entries(test.expected).flatMap(([name, expected]) => {
          const actual = result?.outputs[name]
          const prefix = many ? `${L(level.outputLabels?.[name]) ?? name} ` : ''
          return [[`${prefix}${tr('期望', 'expected')}`, valueAt(expected)], [`${prefix}${tr('你的', 'yours')}`, actual?.w === expected.w && actual?.h === expected.h ? valueAt(actual) : null]]
        }),
      ]
    : null
  const readout = !probe
    ? tr('指针停在图上看数值', 'Hover a picture to read it')
    : readings
      ? <>({probe.x}, {probe.y}) {readings.map(([label, v], k) => <span key={label}>{k ? ' · ' : ''}{label}{v?.at} <b>{v ? v.value.toFixed(3) : '—'}</b></span>)}</>
      : <>{tr('频率 ', 'frequency ')}({probe.x}, {probe.y}) <b>{probe.value.toFixed(3)}</b></>
  const probeLine = (inputsAreImages || Object.values(test.expected).some((img) => kindOf(img) === 'image')) && <p className="pixel-probe">{readout}</p>

  if (part === 'tests') return list
  if (part === 'readout') return <span className="pixel-probe">{readout}</span>
  // On a desktop the verdict shows only once the tests have run; until then the pane's head reads out the pixel.
  if (part === 'verdict') return run?.untested || !result ? null : verdictOf(Object.keys(test.expected).map(checkOf))
  if (part === 'views') return roles.length > 0 && <ViewSwitch value={outputsAreImages ? outView : inView} onChange={(v) => onView(roles, v)} shows={level.shows} fresh={level.freshViews} compact />
  if (part === 'row') {
    return (
      <div className="test-strip" key={testIndex}>
        {inputFigures}
        {Object.entries(test.expected).map(([name, expected]) => <Fragment key={name}>{outputFigures(name, expected)}</Fragment>)}
      </div>
    )
  }
  return (
    <aside className="tests" data-pane="tests">
      {head}
      {runButton}
      {hiddenNote}
      {list}
      <section className="test-detail" key={testIndex}>
        {inputs}
        {outputs}
        {probeLine}
      </section>
    </aside>
  )
}


function OutputImages({ expected, actual, fits, view, tolerance, theme, onHover, scan, onScan, prefix = '' }) {
  const range = rangeOf(expected)
  const missing = actual ? tr('尺寸不对', 'Wrong size') : tr('未连接', 'Not connected')
  const profile = view === 'profile'
  const row = Math.min(expected.h - 1, Math.max(0, Math.round(scan * (expected.h - 1))))
  return (
    <>
      <figure>
        {profile ? <ProfileView img={expected} range={range} size={132} theme={theme} scan={scan} onScan={onScan} onHover={onHover} compact /> : <ValueView img={expected} view={view} range={range} size={132} theme={theme} onHover={onHover} grid />}
        <figcaption>{prefix}{tr('期望', 'Expected')}</figcaption>
      </figure>
      <figure>
        {!fits ? <ImageView img={null} label={missing} /> : profile ? <ProfileView img={actual} range={range} size={132} theme={theme} scan={scan} onScan={onScan} onHover={onHover} compact /> : <ValueView img={actual} view={view} range={range} size={132} theme={theme} onHover={onHover} grid />}
        <figcaption>{prefix}{tr('你的输出', 'Your output')}</figcaption>
      </figure>
      <figure>
        <ImageView img={fits ? actual : null} against={expected} tolerance={tolerance} theme={theme} onHover={onHover} label="—" grid />
        <figcaption>{prefix}{tr('误差', 'Error')}</figcaption>
      </figure>
      {profile && (
        <figure className="test-curve">
          <CurveView img={fits ? rowOf(actual, row) : null} expected={rowOf(expected, row)} tolerance={tolerance} width={280} height={110} onHover={(p) => onHover(p && { ...p, y: row, h: expected.h })} />
          <figcaption>{tr(`第 ${row} 行：`, `Row ${row}: `)}<i className="is-expected" />{tr('期望', 'expected')} <i className="is-band" />{tr('允许范围', 'allowed band')} <i />{tr('你的输出', 'your output')} · {tr('在图上拖动换一行', 'drag on a picture to change row')}</figcaption>
        </figure>
      )}
    </>
  )
}
