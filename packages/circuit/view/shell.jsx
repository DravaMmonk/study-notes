import { createElement, useMemo, useState } from 'react'
import { CircuitBoard, Package } from 'lucide-react'
import { L, tr, taskOpen, playedTask, taskContext, playId } from 'kernel/view'
import { workshopTrayNames } from '../core/trays.js'
import PartsBook, { levelOf, useParts } from './PartsBook.jsx'

/** Circuit-owned panels, references and workshop mounted in the generic game shell. */
export function useCircuitShell({ game, progress, level, author, solved, phone, theme, setSheet }) {
  const [bench, setBench] = useState(() => !level && !author ? new URLSearchParams(window.location.search).get('workshop') : null)
  const box = useParts(game, progress)
  const open = (tray = '') => {
    setBench(tray)
    const url = new URL(window.location.href)
    url.searchParams.set('workshop', tray)
    window.history.replaceState({}, '', url)
    window.scrollTo({ top: 0, behavior: 'instant' })
  }
  const sources = useMemo(() => {
    if (level || author || !game.workshop) return []
    return game.levels.slice().reverse().flatMap(candidate => {
      if (!game.isOpen(candidate, solved, progress.all)) return []
      return candidate.tasks.map((task, at) => ({ candidate, at, task, kind: game.kinds[playId(task)] }))
        .reverse().filter(({ at, kind }) => kind?.editor === 'circuit' && taskOpen(game, progress, candidate.id, at))
    })
  }, [game, level, author, progress, solved])
  const circuitTrays = useMemo(() => new Set(workshopTrayNames(game.course?.trays, game.partDefs?.parts)), [game])
  const boards = sources.flatMap(source => {
    const trays = game.course?.tray(source.task.source)?.filter(name => circuitTrays.has(name)) ?? ['']
    return trays.length ? [{ ...source, trays }] : []
  })
  const workshop = (bench && boards.find(({ trays }) => trays.includes(bench))) || boards[0]
  const task = bench !== null && workshop ? playedTask(taskContext(game, progress, workshop.candidate, workshop.at)) : null
  const tray = task && (workshop.trays.includes(bench) ? bench : workshop.trays[0])
  const trays = [...circuitTrays].filter(name => boards.some(({ trays }) => trays.includes(name)))
  const part = id => game.parts?.all.find(part => part.key === id)
  return {
    close(url) { setBench(null); url.searchParams.delete('workshop') },
    taskProps: { workshop: !author && game.workshop },
    area: task && {
      title: tr('元件工坊', 'Component workshop'), leaveLabel: tr('离开元件工坊', 'Leave the workshop'),
      content: createElement(workshop.kind.Screen, {
        ...task.screen, key: `${task.key}#${tray}`, phone, theme, workshop: game.workshop,
        workshopOnly: true, workshopTray: tray, workshopTrays: trays, onWorkshopTray: open,
      }),
    },
    mapActions: <>
      {workshop && <button className="kit-btn is-label" onClick={() => open()}><CircuitBoard size={15} /><span>{tr('元件工坊', 'Component workshop')}</span></button>}
      {game.parts && <button className="kit-btn is-label wiki-button" onClick={() => setSheet('circuit:parts')}><Package size={15} /><span>{tr('元件箱')}</span><b>{box.unread.length > 0 ? tr(`新增 ${box.unread.length} 个`, `${box.unread.length} new`) : `${game.parts.earned(progress).length}/${game.parts.all.length}`}</b></button>}
    </>,
    reference(kind, id) {
      if (kind !== 'part') return null
      const value = part(id)
      return value && { title: L(value.name), open: box.earned.has(id), at: levelOf(game, value), panel: 'circuit:parts' }
    },
    panel({ sheet, start, close }) {
      return sheet === 'circuit:parts' && <PartsBook game={game} box={box} phone={phone} start={start} onClose={close} />
    },
    progressText: {
      all: tr('所有关卡、任务、元件和百科均已开放，进度照常记录。清空进度会恢复正常解锁。'),
      open: tr('开放所有关卡、任务、元件和百科。'),
      clear: tr('清空后，这台设备上已通过的关卡、搭建的电路和获得的元件将全部删除，无法恢复。'),
      leave: tr('这一关的电路和进度都会保存，可以随时返回。'),
    },
  }
}
