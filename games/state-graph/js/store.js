// Per-browser progress: finished levels, seen intros and per-level board state.

const KEY = 'state-graph-v2';
const blank = () => ({ done: {}, seen: {}, data: {}, all: false });

export const S = (() => {
  try { return Object.assign(blank(), JSON.parse(localStorage.getItem(KEY)) || {}); } catch (e) { return blank(); }
})();

export const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* storage unavailable */ } };
export const resetAll = () => { Object.assign(S, blank()); save(); };
