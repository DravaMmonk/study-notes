import { useState } from 'react'
import { Check, X } from 'lucide-react'
import ImageView from './ImageView.jsx'
import { rangeOf } from './display.js'

// The right-hand panel: every test as a row, and the chosen test laid out as input → expected / actual / error.
export default function TestPanel({ level, run, testIndex, onSelect, inputLabels, theme }) {
  const [probe, setProbe] = useState(null)
  const test = level.tests[testIndex]
  const result = run?.results[testIndex]
  const passed = run?.results.filter((r) => r.pass).length ?? 0

  return (
    <aside className="tests">
      <header className="panel-head">
        <span>测试</span>
        <strong className={run?.pass ? 'is-pass' : ''}>{passed} / {level.tests.length}</strong>
      </header>
      <ol className="test-list">
        {level.tests.map((t, index) => {
          const ok = run?.results[index]?.pass
          return (
            <li key={t.label}>
              <button className={`test-row ${index === testIndex ? 'is-active' : ''} ${ok ? 'is-pass' : 'is-fail'}`} onClick={() => onSelect(index)}>
                {ok ? <Check size={13} /> : <X size={13} />}
                <span>{t.label}</span>
              </button>
            </li>
          )
        })}
      </ol>

      <section className="test-detail">
        <div className="test-images">
          {Object.entries(test.inputs).map(([name, img]) => (
            <figure key={name}>
              <ImageView img={img} theme={theme} onHover={setProbe} />
              <figcaption>{inputLabels?.[name] ?? '输入'}</figcaption>
            </figure>
          ))}
        </div>
        {Object.entries(test.expected).map(([name, expected]) => {
          const actual = result?.outputs[name]
          const check = result?.checks.find((c) => c.name === name)
          const range = rangeOf(expected)
          const tolerance = (test.check ?? level.check)?.tolerance ?? 0.02
          return (
            <div key={name} className="test-images">
              <figure>
                <ImageView img={expected} range={range} theme={theme} onHover={setProbe} />
                <figcaption>期望</figcaption>
              </figure>
              <figure>
                <ImageView img={actual?.w === expected.w ? actual : null} range={range} theme={theme} onHover={setProbe} label={actual ? '尺寸不对' : '未连接'} />
                <figcaption>你的输出</figcaption>
              </figure>
              <figure>
                <ImageView img={actual?.w === expected.w ? actual : null} against={expected} tolerance={tolerance} theme={theme} onHover={setProbe} label="—" />
                <figcaption>误差</figcaption>
              </figure>
              <p className={`test-verdict ${check?.pass ? 'is-pass' : 'is-fail'}`}>{check?.pass ? '通过' : check?.reason || '未通过'}</p>
            </div>
          )
        })}
        <p className="pixel-probe">
          {probe ? `(${probe.x}, ${probe.y}) = ${probe.value.toFixed(3)}${probe.expected !== undefined ? ` · 期望 ${probe.expected.toFixed(3)}` : ''}` : '把鼠标停在图上，看每一格的数值'}
        </p>
      </section>
    </aside>
  )
}
