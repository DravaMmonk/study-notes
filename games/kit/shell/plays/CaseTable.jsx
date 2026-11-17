import RowTable from '../RowTable.jsx'
import { L } from '../i18n.js'
import { WORDS } from '../words.js'

/** Pick a case to inspect its inputs and result, with the target column controlled by the play. */
export default function CaseTable({ play, inputs, rows, at, select }) {
  const columns = inputs.map(({ key, label }) => ({
    key: `input:${key}`, label, cell: ({ given }) => L(given[key]),
  }))
  if (play.target === 'shown') {
    columns.push({ key: 'target', label: WORDS.wanted, cell: ({ want }) => L(want) })
  }
  columns.push({
    key: 'result',
    label: WORDS.result,
    cell: ({ got, state }) => <span className={state === 'pass' ? 'ck-right' : state === 'fail' ? 'ck-wrong' : undefined}>{L(got)}</span>,
  })
  return <RowTable rows={rows} columns={columns} onPick={select} rowClass={(index) => index === at ? 'is-on' : ''} />
}
