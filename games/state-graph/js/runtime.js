// Shared runtime: the open level session plus the shell functions that game modes call.
// js/screen.jsx installs the shell functions for the open level, so modes depend on this object instead of on the
// shared game shell (../../kit/shell).

import { reduced } from './util.js';

export const rt = {
  cur: null,
  boardWidth: 0, // px the test board may take across, where the page lays it out to a width (a desktop circuit level)
  refresh() {}, refreshKeepRange() {}, renderBoard() {}, persist() {},
  pass() {}, fail() {}, startRun() {}, endRun() {},
  openSheet() {}, closeSheet() {},
};

/**
 * Step animation that the player can skip, pause, and step through. Waits resolve at once when skipping or with
 * reduced motion; while paused a wait holds until the player steps or continues.
 */
export const Anim = {
  skipping: false, paused: false, wake: null, listeners: new Set(),
  /** A run starts; `paused` starts it held on its first step (the 单步 button). */
  begin(paused = false) { this.skipping = false; this.paused = paused; this.tell(); },
  skip() { this.skipping = true; this.paused = false; this.tell(); if (this.wake) this.wake(); },
  pause() { this.paused = true; this.tell(); },
  resume() { this.paused = false; this.tell(); if (this.wake) this.wake(); },
  /** One step on while paused. */
  step() { if (this.wake) this.wake(); },
  /** Tell whoever draws the controls that the state changed. */
  tell() { this.listeners.forEach(fn => fn()); },
  wait(ms) {
    if (this.skipping) return Promise.resolve();
    if (this.paused) return new Promise(res => { this.wake = () => { this.wake = null; res(); }; });
    if (reduced()) return Promise.resolve();
    return new Promise(res => { const t = setTimeout(() => { this.wake = null; res(); }, ms); this.wake = () => { clearTimeout(t); this.wake = null; res(); }; });
  },
};
