// Cut the seam: walk the cheapest seam back up the seam table by hand, cut it, then let the machine carve more, and
// compare the carved picture with one squeezed to the same width.
import { useRef, useState } from 'react'
import { E } from '../../model/scene.js'
import { seamTable, seamPath, shade } from '../../model/worlds/picture.js'
import { tr } from '../../lang.js'
import HandLevel from '../HandLevel.jsx'
import Scene from '../Scene.jsx'
import { sceneSVG } from '../svg.js'
import { SkipIcon, buzz, reduced, useLater, usePlayer, useVerdict } from '../play.jsx'

const rc = (id) => id.split(',').map(Number)
/** The picture with one pixel of each row taken out, along `path` ([r, c] a row). */
const cutOut = (img, path) => {
  const by = new Map(path.map(([r, c]) => [r, c]))
  return img.map((row, r) => row.filter((_, c) => c !== by.get(r)))
}

/** A small picture with its caption. */
function Thumb({ img, label }) {
  const px = 10
  const cells = img.flatMap((row, r) => row.map((v, c) => ({ id: `${r},${c}`, x: c * px, y: r * px, w: px, h: px, rx: 0, value: '', fill: shade(v), cls: 'px' })))
  return (
    <figure>
      <span className="sg-figure" dangerouslySetInnerHTML={{ __html: sceneSVG({ cells, edges: [] }, { pad: 2, maxScale: 1.6, label }) }} />
      <figcaption>{label}</figcaption>
    </figure>
  )
}

export default function Seam({ game, level, phone, solve, fail }) {
  const L = level.source
  const [img, setImg] = useState(() => L.img.map((r) => r.slice()))
  const [cuts, setCuts] = useState(0)
  const [path, setPath] = useState([])
  const [msg, setMsg] = useState(null) // { cls, body() }
  const [auto, setAuto] = useState(false)
  const player = usePlayer()
  const verdict = useVerdict({ level, solve, fail })
  const later = useLater()
  const root = useRef(null)
  const card = useRef(null)
  const W = img[0].length, H = img.length
  const { e, f } = seamTable(img)
  const top = path.length === H
  /** Squeeze the original to `w` columns by dropping evenly spaced columns, as plain resizing would. */
  const squeeze = (w) => {
    const C = L.img[0].length, keep = Array.from({ length: w }, (_, k) => Math.round((k * (C - 1)) / Math.max(1, w - 1)))
    return L.img.map((row) => keep.map((c) => row[c]))
  }

  /** The machine finds and cuts `n` seams, one at a time, each shown before it goes. */
  const carve = async (n) => {
    player.begin()
    // On a phone the carving is watched on the board, wherever the page was.
    const page = phone && root.current?.querySelector('.pl-scroll')
    if (page && card.current) page.scrollTop += card.current.getBoundingClientRect().top - page.getBoundingClientRect().top - 8
    let now = img, count = cuts
    for (let k = 0; k < n && now[0].length > 2; k++) {
      const seam = seamPath(now)
      setPath(seam)
      await player.wait(player.pace(0, n).per)
      if (!player.alive) return
      now = cutOut(now, seam)
      count++
      setImg(now)
      setCuts(count)
      setPath([])
    }
    player.end()
    if (count >= L.cuts) later(verdict.pass, reduced() ? 0 : 900)
  }
  const running = player.running

  const onCell = (id) => {
    if (running || auto || top) return
    const [r, c] = rc(id)
    if (!path.length) {
      const min = Math.min(...f[H - 1])
      if (f[r][c] !== min) {
        const v = f[r][c]
        setMsg({ cls: 'bad', body: () => tr(<>这一格是 <b>{v}</b>，最底一行最小的是 <b>{min}</b>。缝要花的能量越少越好。</>, <>This cell is <b>{v}</b>, but the smallest in the bottom row is <b>{min}</b>. The less energy a seam costs, the better.</>) })
        buzz(20)
        return
      }
      setPath([[r, c]])
      setMsg(null)
      buzz(8)
      return
    }
    const [r0, c0] = path.at(-1), need = f[r0][c0] - e[r0][c0]
    if (f[r][c] !== need) {
      const a = f[r][c], b = e[r0][c0], cur = f[r0][c0]
      setMsg({ cls: 'bad', body: () => tr(<>{a} + {b} = <b>{a + b}</b>，不等于当前格子的 <b>{cur}</b>。缝不是从这里来的。</>, <>{a} + {b} = <b>{a + b}</b>, which isn’t the current cell’s <b>{cur}</b>. The seam didn’t come from here.</>) })
      buzz(20)
      return
    }
    const next = [...path, [r, c]]
    setPath(next)
    setMsg(next.length === H ? { cls: 'good', body: () => tr('一直退到了顶行：这就是能量最小的那条缝。', 'Traced all the way back to the top row: this is the lowest-energy seam.') } : null)
    buzz(8)
  }
  const cutIt = () => {
    setImg(cutOut(img, path))
    setCuts(cuts + 1)
    setPath([])
    setAuto(true)
    setMsg({ cls: 'good', body: () => tr('剪掉了！图片窄了一列。', 'Cut! The picture is one column narrower.') })
    buzz(15)
  }

  // The picture on top, its seam table underneath, column for column.
  const on = new Set(path.map((p) => p.join())), cells = [], sp = 40, y0 = H * sp + 34
  const now = path.at(-1)
  const opts = now && !top ? [now[1] - 1, now[1], now[1] + 1].filter((c) => c >= 0 && c < W).map((c) => `${now[0] - 1},${c}`) : !path.length && !auto ? f[H - 1].map((_, c) => `${H - 1},${c}`) : []
  img.forEach((row, r) => row.forEach((v, c) => cells.push({ id: `p${r},${c}`, x: c * sp, y: r * sp, w: sp, h: sp, rx: 0, value: '', fill: shade(v), cls: on.has(`${r},${c}`) ? 'cut' : 'px' })))
  f.forEach((row, r) => row.forEach((v, c) => {
    const id = `${r},${c}`
    cells.push({ id, x: c * sp, y: y0 + r * sp, w: sp - 4, h: sp - 4, rx: 7, value: v, corner: opts.includes(id) || (now && now.join() === id) ? `+${e[r][c]}` : '', cls: [on.has(id) ? 'path' : '', opts.includes(id) ? 'pred' : ''].filter(Boolean).join(' '), tap: opts.includes(id), aria: tr(`第 ${r + 1} 行第 ${c + 1} 列`, `row ${r + 1}, column ${c + 1}`) })
  }))
  const edges = []
  for (let q = 0; q + 1 < path.length; q++) edges.push(E(path[q].join(), path[q + 1].join(), 'good'))

  const note = auto
    ? cuts >= L.cuts ? tr(`剪了 ${cuts} 条缝，图片从 ${L.img[0].length} 列变成了 ${W} 列。`, `${cuts} seams cut: the picture has gone from ${L.img[0].length} columns to ${W}.`) : tr(`已经剪了 ${cuts} 条缝，图片现在 ${W} 列宽。`, `${cuts} seam${cuts === 1 ? '' : 's'} cut so far; the picture is now ${W} columns wide.`)
    : !path.length ? tr('上面是图片，下面是缝表：每格是「从顶行到这里，最省的缝要花多少能量」。正在看的格子角上，会标出这个像素自己的能量。先点最底一行里最小的那一格。', 'The picture is on top and the seam table below: each cell is “the least energy a seam from the top row to here can cost”. The cell you are looking at shows that pixel’s own energy in its corner. Start by clicking the smallest cell in the bottom row.')
      : !top ? tr('再往上一行：三个虚线框里，哪一格的数 + 当前格子的能量，正好等于当前格子的数？', 'Up another row: of the three dashed frames, which cell’s number + the current pixel’s energy exactly equals the current cell’s number?')
        : tr('这条缝找到了，图片上标红的就是它。点「剪掉」。', 'Seam found: it is the one marked in red on the picture. Click “Cut it”.')
  const dock = running
    ? { meta: tr(<>剪了 <b>{cuts}</b> 条</>, <><b>{cuts}</b> cut</>), go: { label: tr('跳过动画', 'Skip animation'), busy: true, onClick: player.skip } }
    : auto
      ? cuts >= L.cuts
        ? { meta: tr('剪完了', 'All cut') }
        : { meta: tr(<>剪了 <b>{cuts}</b> / {L.cuts} 条</>, <><b>{cuts}</b> / {L.cuts} cut</>), secondary: { label: tr('再剪一条', 'Cut one more'), onClick: () => carve(1) }, go: { label: tr('剪到够', 'Cut the rest'), icon: <SkipIcon />, onClick: () => carve(L.cuts - cuts) } }
      : top
        ? { meta: tr('找到了一条缝', 'Seam found'), go: { label: tr('剪掉', 'Cut it'), onClick: cutIt } }
        : { meta: tr(<>已经倒推了 <b>{Math.max(0, path.length - 1)}</b> 行</>, <><b>{Math.max(0, path.length - 1)}</b> rows traced back</>), secondary: path.length ? { label: tr('重新找', 'Start over'), onClick: () => { setPath([]); setMsg(null) } } : null }
  return (
    <HandLevel
      game={game}
      level={level}
      phone={phone}
      rootRef={root}
      bcardRef={card}
      board={<Scene scene={{ cells, edges }} opt={{ label: tr('棋盘', 'Board'), minScale: 0.5, maxScale: 1 }} onCell={onCell} />}
      note={note}
      after={cuts >= L.cuts && (
        <div className="afterbox">
          <span className="eyebrow">{tr(`同样窄 ${cuts} 列`, `${cuts} columns narrower, two ways`)}</span>
          <div className="orders thumbs"><Thumb img={L.img} label={tr('原图', 'Original')} /><Thumb img={img} label={tr('剪缝', 'Seams cut')} /><Thumb img={squeeze(W)} label={tr('直接压扁', 'Squashed')} /></div>
          <p className="cap">{tr('剪缝只拿掉不起眼的背景，字母原样留着；直接压扁时，每个字母都被挤变形了。', 'Seam carving removes only unremarkable background and leaves the letters as they were; squashing distorts every letter.')}</p>
        </div>
      )}
      panel={
        <div className="pcard">
          <h3>{tr('剪缝', 'Seam carving')}<small>{tr(`${cuts} / ${L.cuts} 条`, `${cuts} / ${L.cuts} seams`)}</small></h3>
          <p>{auto ? tr('规则你已经会了：后面的缝交给机器去找、去剪。', 'You know the rule now: leave the machine to find and cut the remaining seams.') : tr('第一条缝你来找：从最底一行最小的格子出发，每次看它是从上面哪一格走来的，一行一行往上倒推。', 'You find the first seam: start from the smallest cell in the bottom row, see each time which cell above it came from, and trace back up row by row.')}</p>
          {msg && <div className={`msg ${msg.cls}`}>{msg.body()}</div>}
        </div>
      }
      dock={dock}
    />
  )
}
