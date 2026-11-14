import { L } from '../i18n.js'
import { WORDS } from '../words.js'
import './circuit-check-table.css'

/** Pick a case to inspect its inputs and result, with the target column controlled by the play. */
export default function CircuitCheckTable({ play, inputs, rows, at, select }) {
  const showTarget = play.target === 'shown'
  return (
    <table className="circuit-check-table">
      <thead>
        <tr>
          {inputs.map(({ key, label }) => <th key={key}>{L(label)}</th>)}
          {showTarget && <th>{L(WORDS.wanted)}</th>}
          <th>{L(WORDS.result)}</th>
        </tr>
      </thead>
      <tbody>
        {rows.map(({ given, want, got, state }, k) => (
          <tr key={k} className={`${k === at ? 'is-on' : ''} ${state ? `is-${state}` : ''}`} onClick={() => select(k)}>
            {inputs.map(({ key }) => <td key={key}>{L(given[key])}</td>)}
            {showTarget && <td>{L(want)}</td>}
            <td>{L(got)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
