import { isGrid } from '../engine/grid.js'
import { VIEWS, shapeOf, valueText } from '../engine/views.js'
import { L } from '../shell/i18n.js'
import Timeline from '../shell/Timeline.jsx'
import { useOffered, useViewPicks } from './choice.js'
import GridInspector from './grid/GridInspector.jsx'
import GridView, { GridPicture } from './grid/GridView.jsx'
import { DRAWN, SIZE, sized } from './plots/drawn.js'
import ViewSwitch from './ViewSwitch.jsx'

// One value drawn in a scene (games/DESIGN.md 6.9, ../engine/views.js): every place a game shows a value — a part on
// the board, its detail, a figure beside an introduction or a pass text, a line of text — draws it through here, among
// the views offered (`views`, by default the game's for its shape); the results area is Results.jsx. How large, whether
// it has axes, whether a cell can be read or picked: the scene's, not the caller's. A value the screen keeps a view for
// (`of`, ./picks.js) is drawn in it, and switched in its detail (and its results row): a card draws the view its detail
// shows. A figure is an example, drawn in the first view offered, never switched.
//
//   <Show value={v} scene="card" of="blur#out" />
//   <Show value={grid} scene="detail" of="blur#out" label="Output" explain={(x, y) => text} />
//   <Show value={grid} scene="figure" views={['numbers', 'pixels']} label="…" mark={{ x, y }} onPick={(x, y) => …} />
//   <Show value={samples} scene="figure" views={['plot']} curve={(x) => Math.cos(x)} label="…" />
//
// shape: the value's (by default a grid or a scalar, ../engine/views.js shapeOf); text(value) a value in words (by
// default valueText); curve(x, row) the function a plot's samples were taken from (plots/Plot.jsx).

/** A grid on a card: in the view picked, drawn small (a plot, a profile, a terrain…), else numbered while it is small
 * and numbers are picked, else a small picture; its size under it (arrows in the plane need none). */
function CardGrid({ value, view }) {
  const size = sized(view) && <small>{value.w} × {value.h}</small>
  const Drawn = DRAWN[view]
  if (Drawn) return <span className="vw-thumb"><Drawn value={value} card size={SIZE.card} />{size}</span>
  if (view === 'pixels' || value.w * value.h > 64) return <span className="vw-thumb"><GridPicture value={value} scale={Math.max(1, Math.floor(96 / Math.max(value.w, value.h)))} />{size}</span>
  const small = value.w <= 4 && value.h <= 3
  return <span className="vw-thumb"><span className={`vw-numbers ${small ? 'is-small' : ''}`}><GridView value={value} numbers cell={(value.c ?? 1) === 3 ? 58 : 32} /></span>{!small && size}</span>
}

/** A value in words, coloured by what it is: none, yes, no. */
const Words = ({ value, text, className = 'vw-value' }) => <span className={`${className} ${value === null || value === undefined ? 'is-none' : typeof value === 'boolean' ? `is-${value}` : ''}`}>{L(text(value))}</span>

export default function Show({ value, shape = shapeOf(value), scene, views, of, label, text = valueText, mark, onPick, explain, curve }) {
  const list = useOffered(shape, views, value)
  const picks = useViewPicks()
  const view = picks.of(scene === 'figure' ? null : of, list)
  const pick = scene === 'detail' && list.length > 1 && picks.pick(of)
  const tool = pick && <ViewSwitch views={list} value={view} onChange={pick} compact />
  if (scene === 'card' || scene === 'inline') {
    if (shape === 'grid' && isGrid(value)) return scene === 'card' ? <CardGrid value={value} view={view} /> : <GridPicture value={value} scale={Math.max(2, Math.floor(16 / value.h))} />
    return <Words value={value} text={text} className={scene === 'card' ? 'vw-value' : 'vw-inline'} />
  }
  // A detail and a figure: the value whole, under its label.
  const head = (label || tool) && <header className="vw-head">{label && <span>{L(label)}</span>}{tool}</header>
  if (shape === 'grid') {
    // The label goes in the head beside the switch, or over a drawn view (which has no caption of its own); else it is
    // the cells' caption.
    const Drawn = DRAWN[view]
    const headed = tool || Drawn
    return (
      <div className={`vw-${scene}`}>
        {headed && head}
        {Drawn ? <Drawn value={value} size={SIZE[scene]} curve={curve} />
          : <GridInspector value={value} view={view} label={!headed && label ? L(label) : undefined} fit dense={scene === 'detail'} mark={mark} onPick={onPick} explainPixel={explain} />}
      </div>
    )
  }
  if (shape === 'bits' || shape === 'ticks') {
    const lane = { key: 'value', label: label ?? '', kind: VIEWS[view]?.lane ?? 'value', ticks: value, text: (v) => L(text(v)) }
    return <div className={`vw-${scene}`}>{tool && <header className="vw-head">{tool}</header>}<Timeline lanes={[lane]} count={value.length} /></div>
  }
  if (shape === 'list') return <div className={`vw-${scene}`}>{head}<p className="vw-seq">{value.length ? value.map((v) => L(text(v))).join(' ') : '—'}</p></div>
  return <div className={`vw-${scene} vw-scalar`}>{label && <span>{L(label)}</span>}<Words value={value} text={text} /></div>
}
