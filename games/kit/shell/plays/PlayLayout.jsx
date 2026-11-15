import { Brief, Level } from '../Layout.jsx'

/** The common layout for a play with a stage, result and run controls. */
export default function PlayLayout({ screen: { game, level, phone }, play, stage, tests, results, dock }) {
  const brief = <Brief game={game} level={level} hint={level.source.hint} phone={phone} />
  return <Level phone={phone} className={play.layout} brief={brief} tests={tests} stage={stage} results={results} dock={dock} />
}
