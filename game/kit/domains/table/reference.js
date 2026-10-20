// Running a level's reference solution outside the game (validate.js, the course audit): the stage set the way the
// level sets it, and a run that reports a broken circuit instead of throwing.
import { runCircuit } from './circuit/worlds.js';

/** What a stage is set to when its reference solution runs: the level's own scan order, filter and table. */
export const optionsOf = (L, s, solution = s.solution) => ({ ...s, dirs: { ...(L.solutionDirs || L.dirs || {}) }, ...(s.dial ? { scan: s.solutionScan } : {}), filter: s.solutionFilter || 'all', remember: s.solutionMem || [], layers: solution?.layers || 1, maxLayers: s.maxLayers || 8, answerLayers: solution?.answerLayers || [0] });
export const run = (V, t, c, o) => { try { return runCircuit(V, t, c, o); } catch (e) { return { error: String(e) }; } };
