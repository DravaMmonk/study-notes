// Shared runtime: the open level session plus the shell functions that game modes call.
// js/screen.jsx installs the shell functions for the open level, so modes depend on this object instead of on the
// shared game shell (../../kit/shell).

import { reduced } from './util.js';

export const rt = {
  cur: null,
  refresh() {}, refreshKeepRange() {}, renderBoard() {}, persist() {},
  pass() {}, fail() {}, startRun() {}, endRun() {},
  openSheet() {}, closeSheet() {},
};

/** Step animation that the player can skip; waits resolve at once when skipping or with reduced motion. */
export const Anim = {
  skipping: false, wake: null,
  begin() { this.skipping = false; },
  skip() { this.skipping = true; if (this.wake) this.wake(); },
  wait(ms) {
    if (this.skipping || reduced()) return Promise.resolve();
    return new Promise(res => { const t = setTimeout(() => { this.wake = null; res(); }, ms); this.wake = () => { clearTimeout(t); this.wake = null; res(); }; });
  },
};
