import { useState } from 'react'
import { usePlayback } from './usePlayback.jsx'

// A level whose test cases are circuits it gives (the play of checking or correcting a circuit by its diagram), the
// same in every game. Each case is one of the level's boards (`boards: [{ label?, board }]`): picking its tab puts it
// on the canvas, and a run goes through the cases in turn. Two plays (`play`):
//
//   'audit'   the boards are fixed, each wrong in its own way; the player edits one piece of work for them all (a
//             domain's configuration, such as the situations that test a declaration), and case k passes when
//             judge(k, work) has nothing to say
//   'repair'  each board is the player's to correct, kept per case; case k passes when judge(k, board) has nothing to say
//
// A domain gives the canvas, the editor of the work, and judge; the kit keeps the work, the case on view and the run.
//
//   const cases = useBoardCases({ level, saved, save, judge, empty, onSolve, lastRun, keepRun })
//
//   level    { play, boards }       saved, save   the level's kept data ({ work } or { boards })
//   judge(k, x) → '' or why case k fails       empty   the work a new level starts from (audit)
//   stepsOf(k, x) → the steps a run goes through on case k ([{ failed?: why }], usePlayback's), so a run can stop
//                   inside a case at the first step that is wrong (a board's own test cases, one at a time)
//   cases.at, cases.select(k), cases.board (the board on view), cases.boards (every case's, as it stands now),
//   cases.setBoard(board) (repair), cases.work,
//   cases.setWork(work) (audit), cases.tests (TestTabs' tests: [{ label }]), cases.playback (usePlayback)

const T = (zh, en) => ({ zh, en })

/** A case's label: the level's, or its number. */
export const caseLabel = (level, k) => level.boards[k].label ?? T(`电路 ${k + 1}`, `Board ${k + 1}`)

export function useBoardCases({ level, saved, save, judge, stepsOf = () => [], empty = null, onSolve, lastRun, keepRun }) {
  const repair = level.play === 'repair'
  const [at, setAt] = useState(0)
  const [work, setWorkState] = useState(() => (!repair ? saved?.work ?? empty : null))
  const [boards, setBoards] = useState(() => (repair ? level.boards.map((b, k) => saved?.boards?.[k] ?? b.board) : null))
  const boardOf = (k) => (repair ? boards[k] : level.boards[k].board)
  const setWork = (next) => {
    setWorkState(next)
    save({ work: next })
  }
  const setBoard = (next) => {
    const all = boards.map((b, k) => (k === at ? next : b))
    setBoards(all)
    save({ boards: all })
  }
  const playback = usePlayback({
    count: level.boards.length,
    stepsOf: (k) => stepsOf(k, repair ? boardOf(k) : work),
    check: (k) => judge(k, repair ? boardOf(k) : work),
    onSolve,
    onTest: setAt,
    board: repair ? boards : work,
    kept: lastRun,
    onKeep: keepRun,
  })
  return {
    repair,
    at,
    select: setAt,
    board: boardOf(at),
    boards: level.boards.map((_, k) => boardOf(k)),
    setBoard,
    work,
    setWork,
    tests: level.boards.map((_, k) => ({ label: caseLabel(level, k) })),
    playback,
  }
}
