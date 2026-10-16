import { useState } from 'react'
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
export default function TestPanel({ level, run, onTest, hiddenCount = 0, hiddenMiss, testIndex, onSelect, inputLabels, inView, outView, onView, scan, onScan, theme }) {
  const [probe, setProbe] = useState(null)
  const test = level.tests[testIndex]
  const result = run?.results[testIndex]
  const passed = run?.results.filter((r) => r.pass).length ?? 0
  const all = level.tests.length
  const inputsAreImages = Object.values(test.inputs).some((img) => kindOf(img) === 'image')

  return (
    <aside className="tests" data-pane="tests">
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
      {onTest && <button className={`run-tests ${run?.pass && !hiddenMiss ? 'is-pass' : ''}`} onClick={onTest}>{run?.pass && !hiddenMiss ? <Check size={15} /> : <Play size={14} />}{run?.pass && !hiddenMiss ? tr('全部通过 · 再测一次', 'All passed · run again') : tr('运行测试', 'Run tests')}</button>}
      {hiddenMiss ? (
        <p className="hidden-note is-fail"><X size={13} />{tr(`下面的测试都通过了，但 ${hiddenMiss.total} 组隐藏测试里有 ${hiddenMiss.failed} 组没过：电路可能只对这几张图凑巧成立。`, `Every test below passes, but ${hiddenMiss.failed} of ${hiddenMiss.total} hidden tests fail: the circuit may only happen to work on these pictures.`)}</p>
      ) : hiddenCount > 0 ? (
        <p className="hidden-note"><EyeOff size={13} />{tr(`另有 ${hiddenCount} 组隐藏测试，运行测试时一起检查，通关后公开。`, `${hiddenCount} more hidden ${hiddenCount === 1 ? 'test is' : 'tests are'} checked with every run and shown once you pass.`)}</p>
      ) : null}
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

      <section className="test-detail" key={testIndex}>
        <div className="test-block">
          <div className="test-block-head">
            <span className="test-block-label">{tr('输入', 'Input')}</span>
            {inputsAreImages && <ViewSwitch value={inView} onChange={(v) => onView('input', v)} compact />}
          </div>
          <div className={`test-images is-inputs ${inputsAreImages ? '' : 'is-wide'}`}>
            {Object.entries(test.inputs).map(([name, img]) => (
              <figure key={name}>
                <ValueView img={img} view={inView} size={kindOf(img) === 'image' ? 132 : 280} theme={theme} onHover={setProbe} scan={scan} onScan={onScan} grid />
                <figcaption>{L(inputLabels?.[name]) ?? tr('输入', 'Input')}</figcaption>
              </figure>
            ))}
          </div>
        </div>
        {Object.entries(test.expected).map(([name, expected]) => {
          const actual = result?.outputs[name]
          const check = result?.checks.find((c) => c.name === name)
          const tolerance = (test.check ?? level.check)?.tolerance ?? 0.02
          const kind = kindOf(expected)
          const fits = actual?.w === expected.w && actual?.h === expected.h
          return (
            <div key={name} className={`test-block ${check?.pass === null ? '' : check?.pass ? 'is-pass' : 'is-fail'}`}>
              <div className="test-block-head">
                <span className="test-block-label">{tr('输出', 'Output')}</span>
                {kind === 'image' && <ViewSwitch value={outView} onChange={(v) => onView('output', v)} compact />}
              </div>
              {kind === 'number' ? (
                <NumberCompare expected={expected.data[0]} actual={fits ? actual.data[0] : NaN} tolerance={tolerance} pass={check?.pass} />
              ) : kind === 'signal' ? (
                <figure className="test-curve">
                  <CurveView img={fits ? actual : null} expected={expected} tolerance={tolerance} width={280} height={120} onHover={setProbe} />
                  <figcaption><i className="is-expected" />{tr('期望', 'expected')} <i className="is-band" />{tr('允许范围', 'allowed band')} <i />{tr('你的输出', 'your output')}</figcaption>
                </figure>
              ) : (
                <OutputImages expected={expected} actual={actual} fits={fits} view={outView} tolerance={tolerance} theme={theme} onHover={setProbe} scan={scan} onScan={onScan} />
              )}
              {check?.pass === null ? (
                <p className="test-verdict">{tr('点「运行测试」看这组是否通过', 'Press Run tests to see whether this one passes')}</p>
              ) : (
                <p className={`test-verdict ${check?.pass ? 'is-pass' : 'is-fail'}`}>
                  {check?.pass ? <Check size={14} /> : <X size={14} />}
                  {check?.pass ? tr('这组通过', 'Passed') : L(check?.reason) || tr('未通过', 'Not passed')}
                </p>
              )}
            </div>
          )
        })}
        {(inputsAreImages || Object.values(test.expected).some((img) => kindOf(img) === 'image')) && <p className="pixel-probe">
          {probe ? <>{probe.frequency ? tr('频率 ', 'frequency ') : ''}({probe.x}, {probe.y}) <b>{probe.value.toFixed(3)}</b>{probe.expected !== undefined ? <> · {tr('期望', 'expected')} <b>{probe.expected.toFixed(3)}</b></> : null}</> : tr('把指针停在图上，看每一格的数值', 'Hover over a picture to read each cell')}
        </p>}
      </section>
    </aside>
  )
}

function OutputImages({ expected, actual, fits, view, tolerance, theme, onHover, scan, onScan }) {
  const range = rangeOf(expected)
  if (view === 'profile') {
    const row = Math.min(expected.h - 1, Math.max(0, Math.round(scan * (expected.h - 1))))
    return (
      <>
        <div className="test-images">
          <figure>
            <ProfileView img={expected} range={range} size={132} theme={theme} scan={scan} onScan={onScan} onHover={onHover} compact />
            <figcaption>{tr('期望', 'Expected')}</figcaption>
          </figure>
          <figure>
            {fits ? <ProfileView img={actual} range={range} size={132} theme={theme} scan={scan} onScan={onScan} onHover={onHover} compact /> : <ImageView img={null} label={actual ? tr('尺寸不对', 'Wrong size') : tr('未连接', 'Not connected')} />}
            <figcaption>{tr('你的输出', 'Your output')}</figcaption>
          </figure>
          <figure>
            <ImageView img={fits ? actual : null} against={expected} tolerance={tolerance} theme={theme} onHover={onHover} label="—" grid />
            <figcaption>{tr('误差', 'Error')}</figcaption>
          </figure>
        </div>
        <figure className="test-curve">
          <CurveView img={fits ? rowOf(actual, row) : null} expected={rowOf(expected, row)} tolerance={tolerance} width={280} height={110} onHover={onHover} />
          <figcaption>{tr(`第 ${row} 行：`, `Row ${row}: `)}<i className="is-expected" />{tr('期望', 'expected')} <i className="is-band" />{tr('允许范围', 'allowed band')} <i />{tr('你的输出', 'your output')} · {tr('在图上拖动换一行', 'drag on a picture to change row')}</figcaption>
        </figure>
      </>
    )
  }
  return (
    <div className="test-images">
      <figure>
        <ValueView img={expected} view={view} range={range} size={132} theme={theme} onHover={onHover} grid />
        <figcaption>{tr('期望', 'Expected')}</figcaption>
      </figure>
      <figure>
        <ValueView img={fits ? actual : null} view={view} range={range} size={132} theme={theme} onHover={onHover} label={actual ? tr('尺寸不对', 'Wrong size') : tr('未连接', 'Not connected')} grid />
        <figcaption>{tr('你的输出', 'Your output')}</figcaption>
      </figure>
      <figure>
        <ImageView img={fits ? actual : null} against={expected} tolerance={tolerance} theme={theme} onHover={onHover} label="—" grid />
        <figcaption>{tr('误差', 'Error')}</figcaption>
      </figure>
    </div>
  )
}
