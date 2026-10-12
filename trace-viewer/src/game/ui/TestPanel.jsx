import { useState } from 'react'
import { Check, X } from 'lucide-react'
import ImageView from './ImageView.jsx'
import { rangeOf } from './display.js'

// The test panel: every test as a chip, and the chosen test laid out as input → expected / actual / error.
export default function TestPanel({ level, run, testIndex, onSelect, inputLabels, theme }) {
  const [probe, setProbe] = useState(null)
  const test = level.tests[testIndex]
  const result = run?.results[testIndex]
  const passed = run?.results.filter((r) => r.pass).length ?? 0
  const all = level.tests.length

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
          <span className="test-block-label">输入</span>
          <div className="test-images is-inputs">
            {Object.entries(test.inputs).map(([name, img]) => (
              <figure key={name}>
                <ImageView img={img} theme={theme} onHover={setProbe} grid />
                <figcaption>{inputLabels?.[name] ?? '输入'}</figcaption>
              </figure>
            ))}
          </div>
        </div>
        {Object.entries(test.expected).map(([name, expected]) => {
          const actual = result?.outputs[name]
          const check = result?.checks.find((c) => c.name === name)
          const range = rangeOf(expected)
          const tolerance = (test.check ?? level.check)?.tolerance ?? 0.02
          const fits = actual?.w === expected.w && actual?.h === expected.h
          return (
            <div key={name} className={`test-block ${check?.pass ? 'is-pass' : 'is-fail'}`}>
              <span className="test-block-label">输出</span>
              <div className="test-images">
                <figure>
                  <ImageView img={expected} range={range} theme={theme} onHover={setProbe} grid />
                  <figcaption>期望</figcaption>
                </figure>
                <figure>
                  <ImageView img={fits ? actual : null} range={range} theme={theme} onHover={setProbe} label={actual ? '尺寸不对' : '未连接'} grid />
                  <figcaption>你的输出</figcaption>
                </figure>
                <figure>
                  <ImageView img={fits ? actual : null} against={expected} tolerance={tolerance} theme={theme} onHover={setProbe} label="—" grid />
                  <figcaption>误差</figcaption>
                </figure>
              </div>
              <p className={`test-verdict ${check?.pass ? 'is-pass' : 'is-fail'}`}>
                {check?.pass ? <Check size={14} /> : <X size={14} />}
                {check?.pass ? '这组通过' : check?.reason || '未通过'}
              </p>
            </div>
          )
        })}
        <p className="pixel-probe">
          {probe ? <>({probe.x}, {probe.y}) <b>{probe.value.toFixed(3)}</b>{probe.expected !== undefined ? <> · 期望 <b>{probe.expected.toFixed(3)}</b></> : null}</> : '把指针停在图上，看每一格的数值'}
        </p>
      </section>
    </aside>
  )
}
