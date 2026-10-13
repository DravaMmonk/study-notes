import { useState } from 'react'
import { Check, X } from 'lucide-react'
import ImageView from './ImageView.jsx'
import { rangeOf } from './display.js'
import ValueView, { CurveView, NumberCompare } from './views/ValueView.jsx'
import ViewSwitch from './views/ViewSwitch.jsx'
import { kindOf } from './views/views.js'

// The test panel: every test as a chip, and the chosen test laid out as input → expected / actual / error.
// Numbers are compared on a scale, waveforms as one plot with the allowed band, 2-D values side by
// side in the chosen view with a pixel map of the misses.
export default function TestPanel({ level, run, testIndex, onSelect, inputLabels, views, theme }) {
  const [probe, setProbe] = useState(null)
  const [inView, setInView] = useState(views?.in ?? 'pixels')
  const [outView, setOutView] = useState(views?.out ?? 'pixels')
  const test = level.tests[testIndex]
  const result = run?.results[testIndex]
  const passed = run?.results.filter((r) => r.pass).length ?? 0
  const all = level.tests.length
  const inputsAreImages = Object.values(test.inputs).some((img) => kindOf(img) === 'image')

  return (
    <aside className="tests" data-pane="tests">
      <header className="panel-head">
        <span>测试</span>
        <span className={`tests-meter ${run?.pass ? 'is-pass' : ''}`} aria-label={`${passed} / ${all} 通过`}>
          {level.tests.map((t, index) => <i key={t.label} className={run?.results[index]?.pass ? 'is-on' : ''} />)}
          <b>{passed}/{all}</b>
        </span>
      </header>
      <ol className="test-list">
        {level.tests.map((t, index) => {
          const ok = run?.results[index]?.pass
          return (
            <li key={t.label}>
              <button className={`test-row ${index === testIndex ? 'is-active' : ''} ${ok ? 'is-pass' : 'is-fail'}`} onClick={() => onSelect(index)} aria-pressed={index === testIndex}>
                {ok ? <Check size={13} /> : <X size={13} />}
                <span>{t.label}</span>
              </button>
            </li>
          )
        })}
      </ol>

      <section className="test-detail" key={testIndex}>
        <div className="test-block">
          <div className="test-block-head">
            <span className="test-block-label">输入</span>
            {inputsAreImages && <ViewSwitch value={inView} onChange={setInView} compact />}
          </div>
          <div className={`test-images is-inputs ${inputsAreImages ? '' : 'is-wide'}`}>
            {Object.entries(test.inputs).map(([name, img]) => (
              <figure key={name}>
                <ValueView img={img} view={inView} size={kindOf(img) === 'image' ? 132 : 280} theme={theme} onHover={setProbe} grid />
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
            <div key={name} className={`test-block ${check?.pass ? 'is-pass' : 'is-fail'}`}>
              <div className="test-block-head">
                <span className="test-block-label">输出</span>
                {kind === 'image' && <ViewSwitch value={outView} onChange={setOutView} compact />}
              </div>
              {kind === 'number' ? (
                <NumberCompare expected={expected.data[0]} actual={fits ? actual.data[0] : NaN} tolerance={tolerance} pass={check?.pass} />
              ) : kind === 'signal' ? (
                <figure className="test-curve">
                  <CurveView img={fits ? actual : null} expected={expected} tolerance={tolerance} width={280} height={120} />
                  <figcaption><i className="is-expected" />期望 <i className="is-band" />允许范围 <i />你的输出</figcaption>
                </figure>
              ) : (
                <OutputImages expected={expected} actual={actual} fits={fits} view={outView} tolerance={tolerance} theme={theme} onHover={setProbe} />
              )}
              <p className={`test-verdict ${check?.pass ? 'is-pass' : 'is-fail'}`}>
                {check?.pass ? <Check size={14} /> : <X size={14} />}
                {check?.pass ? '这组通过' : check?.reason || '未通过'}
              </p>
            </div>
          )
        })}
        {(inputsAreImages || Object.values(test.expected).some((img) => kindOf(img) === 'image')) && <p className="pixel-probe">
          {probe ? <>({probe.x}, {probe.y}) <b>{probe.value.toFixed(3)}</b>{probe.expected !== undefined ? <> · 期望 <b>{probe.expected.toFixed(3)}</b></> : null}</> : '把指针停在图上，看每一格的数值'}
        </p>}
      </section>
    </aside>
  )
}

function OutputImages({ expected, actual, fits, view, tolerance, theme, onHover }) {
  const range = rangeOf(expected)
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
