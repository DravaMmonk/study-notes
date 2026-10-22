// The parts' looks: each one a little machine drawn like the robots (circuit/robots.js), on the same 32 × 32 grid and
// with the same pieces (a body, an antenna and its lamp, a base), so they share the robots' colours in every theme.
// What the part does is its face: a merger is a funnel with three pipes in, a gate a barrier, a constant a battery.

import { createElement } from 'react';
import { BLUEPRINTS } from './components.js';

const look = body => `<g class="bot">${body}</g>`;

/** A merger: three pipes running into a funnel; `face` says how it merges. */
const funnel = face => look(`<path class="bot-arm" d="M8 2.5V7M16 2.5V7M24 2.5V7"/>
  <path class="bot-head" d="M4 7H28L21 18H11Z" stroke-linejoin="round"/>
  <rect class="bot-head" x="12" y="17.5" width="8" height="5" rx="1.5"/>
  <rect class="bot-base" x="9" y="23.5" width="14" height="5.5" rx="2.7"/>${face}`);

/** A two-input machine (a and b on two antennae); `face` is its sign. */
const twoArm = face => look(`<path class="bot-ant" d="M10 7L7.5 2.8M22 7L24.5 2.8"/><circle class="bot-lamp" cx="7.5" cy="2.6" r="1.9"/><circle class="bot-lamp" cx="24.5" cy="2.6" r="1.9"/>
  <rect class="bot-head" x="5" y="7" width="22" height="15.5" rx="5"/>${face}
  <rect class="bot-base" x="8" y="24" width="16" height="5" rx="2.5"/>`);

/** A gate: a post with a lamp and a barrier, raised to let through or lowered to stop. */
const gate = (lamp, bar) => look(`<path class="bot-ant" d="M9 14.5V10"/><circle class="${lamp}" cx="9" cy="8" r="2.4"/>
  <rect class="bot-head" x="4" y="14" width="10" height="12.5" rx="3"/>${bar}
  <rect class="bot-base" x="3" y="26.5" width="26" height="3.5" rx="1.75"/>`);

/** A part the levels leave behind: one body with an antenna; `face` shows what it does. */
const box = face => look(`<path class="bot-ant" d="M16 2.5V6.5"/><circle class="bot-lamp" cx="16" cy="2.6" r="2"/>
  <rect class="bot-head" x="4" y="6.5" width="24" height="17" rx="4.5"/>${face}
  <rect class="bot-base" x="8" y="24.5" width="16" height="4.5" rx="2.2"/>`);

export const PART_LOOKS = {
  msum: funnel('<path class="bot-mark" d="M16 9.2V14.2M13.5 11.7H18.5"/>'),
  mmin: funnel('<path class="bot-mark" d="M13 10.2L16 13.4L19 10.2"/>'),
  mmax: funnel('<path class="bot-mark" d="M13 13.4L16 10.2L19 13.4"/>'),
  many: funnel('<circle class="bot-eye-l" cx="16" cy="11.7" r="2.6"/>'),
  /** All the merger models as one entry: the funnel, waiting for its model. */
  merger: funnel('<circle class="bot-eye" cx="12.6" cy="11.7" r="1.3"/><circle class="bot-eye" cx="16" cy="11.7" r="1.3"/><circle class="bot-eye" cx="19.4" cy="11.7" r="1.3"/>'),
  add: twoArm('<path class="bot-mark" d="M16 10.5V18.5M12 14.5H20"/>'),
  mul: twoArm('<path class="bot-mark" d="M12.9 11.4L19.1 17.6M19.1 11.4L12.9 17.6"/>'),
  not: look(`<path class="bot-ant" d="M16 2.5V7"/><circle class="bot-lamp" cx="16" cy="2.6" r="2.2"/>
    <rect class="bot-head" x="5" y="7" width="22" height="16" rx="5"/>
    <rect class="bot-visor" x="9" y="11.5" width="14" height="7" rx="3.5"/><circle class="bot-eye-l" cx="19.5" cy="15" r="2.4"/>
    <rect class="bot-base" x="8" y="24" width="16" height="5" rx="2.5"/>`),
  const: look(`<rect class="bot-base" x="12" y="2.5" width="8" height="4.5" rx="1.5"/>
    <rect class="bot-head" x="7" y="6.5" width="18" height="22" rx="4"/>
    <rect class="bot-eye-l" x="11" y="11" width="10" height="3.2" rx="1"/><rect class="bot-eye-l" x="11" y="16" width="10" height="3.2" rx="1"/><rect class="bot-eye-l" x="11" y="21" width="10" height="3.2" rx="1"/>`),
  pass: gate('bot-eye-l', '<path class="bot-bar" d="M12 16.5L27 6"/>'),
  block: gate('bot-lamp', '<path class="bot-bar is-stop" d="M13 18.5H29"/>'),
  // The parts the levels leave behind (levels/parts.js), for the components box: one machine body, and on its face
  // what the part does.
  counter: box('<path class="bot-mark" d="M19.5 8.8V12.4M17.6 10.8L19.5 12.7L21.4 10.8M8.6 17.6H12.8M10.9 15.7L12.8 17.6L10.9 19.5"/><rect class="bot-eye-l" x="15" y="14.6" width="9" height="6.2" rx="1.4"/><path class="bot-mark" d="M19.5 15.9V19.5M17.7 17.7H21.3" style="stroke-width:1.6"/>'),
  rock: gate('bot-lamp', '<path class="bot-base" d="M17.5 26.5L19 21.6L22.6 20L26.2 21.8L27.6 26.5Z" stroke-linejoin="round"/><path class="bot-bar is-stop" d="M13 17.5H29"/>'),
  // 择优器: the larger of two, one with something added.
  choose: box('<path class="bot-mark" d="M8.6 12.6H13.2M8.6 18.6H13.2M10.9 16.3V20.9M9.6 18.6H12.2"/><rect class="bot-eye-l" x="15" y="12.6" width="9" height="7.6" rx="1.4"/><path class="bot-mark" d="M17.4 18L19.5 15.2L21.6 18" style="stroke-width:1.6"/>'),
  min: box('<path class="bot-mark" d="M19.5 8.8V12.4M17.6 10.8L19.5 12.7L21.4 10.8M8.6 17.6H12.8M10.9 15.7L12.8 17.6L10.9 19.5"/><rect class="bot-eye-l" x="15" y="14.6" width="9" height="6.2" rx="1.4"/><path class="bot-mark" d="M17.4 16.4L19.5 18.9L21.6 16.4" style="stroke-width:1.6"/>'),
  seam: box('<path class="bot-eye" d="M8 9.5h3v3H8zM8 14.5h3v3H8zM21 9.5h3v3h-3zM21 14.5h3v3h-3zM8 19h3v2H8zM21 19h3v2h-3z"/><path class="bot-claw" d="M15.5 8.8L17.6 12.2L14.8 15.6L17 20.8"/>'),
  stairs: box('<path class="bot-mark" d="M8 20.5H12V17H16V13.5H20V10H24"/><rect class="bot-eye-l" x="8.4" y="18.2" width="3.2" height="2.3" rx=".6"/>'),
  order: box('<path class="bot-mark" d="M8.5 10.5H23M23 10.5L9 15.5M9 15.5H23M23 15.5L9 20.5H19.5M17.3 18.4L19.6 20.5L17.3 22.6" style="stroke-width:1.8"/>'),
  align: box('<rect class="bot-eye-l" x="12" y="8.4" width="12" height="2.6" rx="1"/><rect class="bot-eye-l" x="7.4" y="12.6" width="2.6" height="8.6" rx="1"/><path class="bot-mark" d="M13 13.5L20.5 20.5M20.5 16V20.5H16"/>'),
  cost: box('<path class="bot-mark" d="M8.8 11.5L13.6 18M13.6 11.5L8.8 18M17.5 14.8H24M20.8 11.5V18"/>'),
  local: box('<path class="bot-mark" d="M8 9.5L13.5 18.3H24.5"/><rect class="bot-eye-l" x="7.4" y="19.3" width="17.6" height="1.8" rx=".9"/>'),
  judge: box('<path class="bot-mark" d="M12 21V9.5"/><path class="bot-eye-l" d="M12.8 9.4L22.5 12.6L12.8 15.8Z"/>'),
  pack: look(`<path class="bot-arm" d="M12 8C12 3.6 20 3.6 20 8"/>
    <rect class="bot-head" x="6" y="7.5" width="20" height="21" rx="6.5"/><path class="bot-mark" d="M7 14.5H25" style="stroke-width:1.6"/>
    <rect class="bot-eye-l" x="13.5" y="12.6" width="5" height="4.4" rx="1.2"/><path class="bot-mark" d="M10.5 22H21.5" style="stroke-width:1.6"/>`),
  viterbi: box('<path class="bot-eye" d="M7.8 10a1.3 1.3 0 1 0 2.6 0a1.3 1.3 0 1 0-2.6 0M7.8 15a1.3 1.3 0 1 0 2.6 0a1.3 1.3 0 1 0-2.6 0M7.8 20a1.3 1.3 0 1 0 2.6 0a1.3 1.3 0 1 0-2.6 0M14.7 10a1.3 1.3 0 1 0 2.6 0a1.3 1.3 0 1 0-2.6 0M14.7 20a1.3 1.3 0 1 0 2.6 0a1.3 1.3 0 1 0-2.6 0M21.6 15a1.3 1.3 0 1 0 2.6 0a1.3 1.3 0 1 0-2.6 0M21.6 20a1.3 1.3 0 1 0 2.6 0a1.3 1.3 0 1 0-2.6 0"/><path class="bot-claw" d="M9.1 20L16 15L22.9 10"/>'),
  roll: box('<rect class="bot-eye-l" x="8" y="16.6" width="16" height="4.2" rx="1.2"/><path class="bot-mark" d="M10.5 13.8C11.5 8.6 20.5 8.6 21.5 13.8M21.5 13.8L23.8 11.3M21.5 13.8L18.6 12.6" style="stroke-width:1.8"/>'),
  sweep: box('<path class="bot-claw" d="M7.8 12V9.4H24.2V12"/><path class="bot-eye-l" d="M8 14h3.4v4.4H8zM12.9 14h3.4v4.4h-3.4zM17.8 14h3.4v4.4h-3.4z"/><path class="bot-eye" d="M22.6 14H24.2V18.4H22.6Z"/>'),
  wordbreak: box('<rect class="bot-eye-l" x="7.4" y="11" width="7.4" height="7.4" rx="1.4"/><rect class="bot-eye-l" x="17.2" y="11" width="7.4" height="7.4" rx="1.4"/><path class="bot-bar is-stop" d="M16 8V21.5" style="stroke-width:2"/>'),
  interval: box('<path class="bot-mark" d="M8 12V9.5H24V12M16 9.5V12.6M8 18.5V21H14.8V18.5M17.2 18.5V21H24V18.5" style="stroke-width:1.8"/><path class="bot-claw" d="M11.4 17.6L15 14M20.6 17.6L17 14"/>'),
  anyorder: box('<path class="bot-mark" d="M9 9.5V20.5M7 18.4L9 20.5L11 18.4M13.5 10.5H24M21.9 8.5L24 10.5L21.9 12.5M13.5 15.5H20M17.9 13.5L20 15.5L17.9 17.5" style="stroke-width:1.8"/>'),
  layer: box('<path class="bot-mark" d="M16 8.6L24 12L16 15.4L8 12Z" style="stroke-width:1.7"/><path class="bot-eye-l" d="M8 15.4L16 18.8L24 15.4L24 17.2L16 20.6L8 17.2Z"/>'),
  value: box('<rect class="bot-eye-l" x="13.3" y="12.3" width="5.4" height="5.4" rx="1.2"/><path class="bot-mark" d="M16 8.4V11M8.2 15H10.8M23.8 15H21.2M16 21.6V19M14.6 9.8L16 11.2L17.4 9.8M9.6 13.6L11 15L9.6 16.4M22.4 13.6L21 15L22.4 16.4" style="stroke-width:1.7"/>'),
  expect: box('<path class="bot-mark" d="M8.5 15H13.5L21 10.5M13.5 15L21 19.5" style="stroke-width:1.8"/><circle class="bot-eye-l" cx="22.4" cy="10" r="2.6"/><circle class="bot-eye-l" cx="22.2" cy="19.8" r="1.5"/>'),
  /** A part built in an earlier level: a chip with pins all round. */
  part: look(`<path class="bot-arm" d="M3 12.5H7M3 19.5H7M25 12.5H29M25 19.5H29M12.5 3V7M19.5 3V7M12.5 25V29M19.5 25V29"/>
    <rect class="bot-head" x="7" y="7" width="18" height="18" rx="3.5"/>
    <path class="bot-eye-l" d="M16 11.5L20.5 16L16 20.5L11.5 16Z"/>`),
};

// A board built in an earlier level ('bp:<levelId>') looks like the part that level leaves behind.
const lookKey = kind => (PART_LOOKS[kind] ? kind : PART_LOOKS[BLUEPRINTS[kind]?.look] ? BLUEPRINTS[kind].look : 'part');
const markup = kind => PART_LOOKS[lookKey(kind)];

/** A part's look as SVG markup, for the mode's own HTML (sheets). */
export const lookSVG = (kind, cls = 'plook') => `<svg class="${cls}" viewBox="0 0 32 32" aria-hidden="true">${markup(kind)}</svg>`;

// A part's look as an icon component for the circuit kit (its Glyph draws a component at the size it asks for), one
// per part so React keeps it from render to render.
const icons = new Map();
export function lookIcon(kind) {
  const key = lookKey(kind);
  if (!icons.has(key)) {
    const Icon = ({ size = 14 }) => createElement('svg', { className: 'plook', viewBox: '0 0 32 32', width: Math.round(size * 1.7), height: Math.round(size * 1.7), 'aria-hidden': true, dangerouslySetInnerHTML: { __html: markup(key) } });
    Icon.displayName = `PartLook(${key})`;
    icons.set(key, Icon);
  }
  return icons.get(key);
}
