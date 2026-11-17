// How the editor wires a table board (../../../circuit/model.js parts, without the drawing: ui/board.js adds names,
// colours and icons): which nodes the level gives, the ports of each part, a card's outputs (one a sensor it reads),
// what a card is written out with as text (and what it is switched on to read when a text's wire reads it), and the
// wires the engine would refuse, with the engine's own reason.
// model: the course's board model (run.js modelOf); u = { sensors, outs, offers? } of the world the board runs in
// (offers: what each card may read on this task, { view: [sensor], facts: [sensor] }).

import { boardFits, isCircuitBoard } from 'circuit'
import { WORLDS } from './worlds.js';
import { fitted, wiring } from 'table';

/** The world and ports used by a robot task's circuit views. */
export function robotTerms(task) {
  const { sensors, outs } = WORLDS[task.world];
  return {
    sensors, outs, offers: task.given.offers,
    ports: Object.fromEntries(task.ports.filter((port) => port.input).map((port) => [port.input, port])),
  };
}

/** Assign the task's sensor cards before validating the circuit that will actually run. */
export function restoreRobotBoard(model, task, saved, { parts, knows = model.partOf } = {}) {
  if (!isCircuitBoard(saved)) return null;
  const world = WORLDS[task.world];
  const board = fitted(saved, task.given);
  return boardFits(board, parts ?? wiring(model, { sensors: world.sensors, outs: world.outs, offers: task.given.offers }), knows)
    ? board : null;
}
