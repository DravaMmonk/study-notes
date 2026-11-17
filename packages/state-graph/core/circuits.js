import { holds } from 'circuit'
import { CARDS, isGiven } from 'table'
import { WORLDS } from './model/worlds.js'
import { restoreRobotBoard, robotTerms } from './model/wiring.js'

/** The robot's circuits expose the same board and work operations as the other circuit plays. */
export function createRobotCircuits(table, { wire, place }) {
  const { model, course, played } = table
  const builders = Object.fromEntries(table.LEVELS.filter((level) => level.builds).map((level) => [
    level.unlock, played.get(level.id).find((task) => task.taskId === level.builds.task),
  ]))
  const built = Object.fromEntries(Object.entries(model.built).map(([type, part]) => [type, {
    name: part.name,
    desc: part.desc,
    opens: (params) => ({
      level: builders[type] ?? part.artifact,
      circuit: place(part.part.board(params)),
    }),
  }]))
  const board = {
    ticks: true,
    isFixed: isGiven,
    fits: (saved, task, circuit, parts) => Boolean(restoreRobotBoard(model, task, saved, { parts, knows: circuit.partOf })),
    portsIn: (task) => task.ports.filter((port) => port.input).map((port) => ({ name: port.input, label: port.label })),
    portsOut: (task) => WORLDS[task.world].outs.map(([name, label]) => ({ name, label })),
    wiring: (task, circuit) => wire(model, { ...robotTerms(task), workshop: circuit?.workshop }),
    labelOf: (task, id) => CARDS[id]?.name ?? robotTerms(task).ports[id]?.label ?? WORLDS[task.world].outs.find(([key]) => key === id)?.[1] ?? id,
  }
  const views = new WeakMap()
  return {
    BUILT: built,
    forTask(task) {
      if (!views.has(task)) views.set(task, {
        board,
        gameCourse: course,
        BUILT: built,
        parts: built,
        builtBy: (type) => builders[type],
        partOf: model.partOf,
        syncOwn: table.syncOwn,
        holdsIn: (_, flags) => holds(course, { id: task.id, task: task.task }, flags),
        offerIn: table.offerIn,
        opening: (_, progress, project) => {
          const base = views.get(task)
          const active = project ? project(base) : base
          return place(table.opening(task, progress, { parts: active.board.wiring(task, active), knows: active.partOf }))
        },
        stageChain: () => [],
      })
      return views.get(task)
    },
  }
}
