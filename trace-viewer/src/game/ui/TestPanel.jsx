import { useState } from 'react'
import { Check, Circle, EyeOff, Play, X } from 'lucide-react'
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
        <span>测试</span>
        {run?.untested ? (
          <span className="tests-meter is-untested">还没测试</span>
        ) : (
          <span className={`tests-meter ${run?.pass ? 'is-pass' : ''}`} aria-label={`${passed} / ${all} 通过`}>
            {level.tests.map((t, index) => <i key={t.label} className={run?.results[index]?.pass ? 'is-on' : ''} />)}
            <b>{passed}/{all}</b>
          </span>
        )}
      </header>
      {onTest && <button className={`run-tests ${run?.pass && !hiddenMiss ? 'is-pass' : ''}`} onClick={onTest}>{run?.pass && !hiddenMiss ? <Check size={15} /> : <Play size={14} />}{run?.pass && !hiddenMiss ? '全部通过 · 再测一次' : '运行测试'}</button>}
      {hiddenMiss ? (
        <p className="hidden-note is-fail"><X size={13} />下面的测试都通过了，但 {hiddenMiss.total} 组隐藏测试里有 {hiddenMiss.failed} 组没过：电路可能只对这几张图凑巧成立。</p>
      ) : hiddenCount > 0 ? (
        <p className="hidden-note"><EyeOff size={13} />另有 {hiddenCount} 组隐藏测试，运行测试时一起检查，通关后公开。</p>
      ) : null}
      <ol className="test-list">
        {level.tests.map((t, index) => {
          const ok = run?.results[index]?.pass
          return (
            <li key={t.label}>
              <button className={`test-row ${index === testIndex ? 'is-active' : ''} ${ok === null ? '' : ok ? 'is-pass' : 'is-fail'}`} onClick={() => onSelect(index)} aria-pressed={index === testIndex}>
                {ok === null ? <Circle size={11} /> : ok ? <Check size={13} /> : <X size={13} />}
                <span>{t.label}</span>
                {t.hidden && <em className="hidden-tag">隐藏</em>}
              </button>
            </li>
          )
        })}
      </ol>

      <section className="test-detail" key={testIndex}>
        <div className="test-block">
          <div className="test-block-head">
            <span className="test-block-label">输入</span>
            {inputsAreImages && <ViewSwitch value={inView} onChange={(v) => onView('input', v)} compact />}
          </div>
          <div className={`test-images is-inputs ${inputsAreImages ? '' : 'is-wide'}`}>
            {Object.entries(test.inputs).map(([name, img]) => (
              <figure key={name}>
                <ValueView img={img} view={inView} size={kindOf(img) === 'image' ? 132 : 280} theme={theme} onHover={setProbe} scan={scan} onScan={onScan} grid />
                <figcaption>{inputLabels?.[name] ?? '输入'}</figcaption>
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
                <span className="test-block-label">输出</span>
                {kind === 'image' && <ViewSwitch value={outView} onChange={(v) => onView('output', v)} compact />}
              </div>
              {kind === 'number' ? (
                <NumberCompare expected={expected.data[0]} actual={fits ? actual.data[0] : NaN} tolerance={tolerance} pass={check?.pass} />
              ) : kind === 'signal' ? (
                <figure className="test-curve">
                  <CurveView img={fits ? actual : null} expected={expected} tolerance={tolerance} width={280} height={120} onHover={setProbe} />
                  <figcaption><i className="is-expected" />期望 <i className="is-band" />允许范围 <i />你的输出</figcaption>
                </figure>
              ) : (
                <OutputImages expected={expected} actual={actual} fits={fits} view={outView} tolerance={tolerance} theme={theme} onHover={setProbe} scan={scan} onScan={onScan} />
              )}
              {check?.pass === null ? (
                <p className="test-verdict">点「运行测试」看这组是否通过</p>
              ) : (
                <p className={`test-verdict ${check?.pass ? 'is-pass' : 'is-fail'}`}>
                  {check?.pass ? <Check size={14} /> : <X size={14} />}
                  {check?.pass ? '这组通过' : check?.reason || '未通过'}
                </p>
              )}
            </div>
          )
        })}
        {(inputsAreImages || Object.values(test.expected).some((img) => kindOf(img) === 'image')) && <p className="pixel-probe">
          {probe ? <>{probe.frequency ? '频率 ' : ''}({probe.x}, {probe.y}) <b>{probe.value.toFixed(3)}</b>{probe.expected !== undefined ? <> · 期望 <b>{probe.expected.toFixed(3)}</b></> : null}</> : '把指针停在图上，看每一格的数值'}
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
            <figcaption>期望</figcaption>
          </figure>
          <figure>
            {fits ? <ProfileView img={actual} range={range} size={132} theme={theme} scan={scan} onScan={onScan} onHover={onHover} compact /> : <ImageView img={null} label={actual ? '尺寸不对' : '未连接'} />}
            <figcaption>你的输出</figcaption>
          </figure>
          <figure>
            <ImageView img={fits ? actual : null} against={expected} tolerance={tolerance} theme={theme} onHover={onHover} label="—" grid />
            <figcaption>误差</figcaption>
          </figure>
        </div>
        <figure className="test-curve">
          <CurveView img={fits ? rowOf(actual, row) : null} expected={rowOf(expected, row)} tolerance={tolerance} width={280} height={110} onHover={onHover} />
          <figcaption>第 {row} 行：<i className="is-expected" />期望 <i className="is-band" />允许范围 <i />你的输出 · 在图上拖动换一行</figcaption>
        </figure>
      </>
    )
  }
  return (
    <div className="test-images">
      <figure>
        <ValueView img={expected} view={view} range={range} size={132} theme={theme} onHover={onHover} grid />
        <figcaption>期望</figcaption>
      </figure>
      <figure>
        <ValueView img={fits ? actual : null} view={view} range={range} size={132} theme={theme} onHover={onHover} label={actual ? '尺寸不对' : '未连接'} grid />
        <figcaption>你的输出</figcaption>
      </figure>
      <figure>
        <ImageView img={fits ? actual : null} against={expected} tolerance={tolerance} theme={theme} onHover={onHover} label="—" grid />
        <figcaption>误差</figcaption>
      </figure>
    </div>
  )
}
