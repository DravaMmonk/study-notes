import { Play, RotateCcw } from 'lucide-react'
import { L, tr } from '../shell/i18n.js'

// A small bench for trying one part, the same in every game (the parts box, games/kit/shell/PartsBook.jsx): a row of
// tests to feed it, a Run button and what happened, over a board the game draws (`children`) with the part at its
// centre. Settings and inputs change on the board; the results there are the last run's until Run is pressed again.
//
// tests: [{ label }]   test / onTest(k): the one fed in   onRun(): run it   state: 'idle' | 'ran' | 'stale'
// onReset(): back to the part's own settings   note: one line on what to try
// panel: under the board, the controls of the block tapped on a phone   height: 'auto' lets a phone board run long

export default function DemoBench({ tests = [], test = 0, onTest, onRun, onReset, state = 'idle', note, height = 340, panel, children }) {
  return (
    <section className={`demo-bench is-${state}`} aria-label={tr('试一试', 'Try it')}>
      <header className="demo-bar">
        <span className="panel-label">{tr('试一试', 'Try it')}</span>
        {tests.length > 1 && (
          <div className="demo-tests" role="tablist" aria-label={tr('测试', 'Tests')}>
            {tests.map((t, k) => (
              <button key={k} type="button" role="tab" aria-selected={k === test} className="demo-test" onClick={() => onTest(k)}>{L(t.label)}</button>
            ))}
          </div>
        )}
        <span className="demo-state" aria-live="polite">{state === 'stale' ? tr('已修改，请重新运行查看结果', 'Changed: run again to see the result') : state === 'ran' ? tr('运行完成', 'Run complete') : tr('还没运行', 'Not run yet')}</span>
        {onReset && <button type="button" className="demo-reset" onClick={onReset} aria-label={tr('恢复默认', 'Reset')} title={tr('恢复默认', 'Reset')}><RotateCcw size={14} /></button>}
        <button type="button" className="demo-run" onClick={onRun}><Play size={14} /><span>{tr('运行', 'Run')}</span></button>
      </header>
      <div className={`demo-board ${height === 'auto' ? 'is-auto' : ''}`} style={height === 'auto' ? undefined : { height }}>{children}</div>
      {panel && <div className="demo-panel">{panel}</div>}
      {note && <p className="demo-note">{L(note)}</p>}
    </section>
  )
}
