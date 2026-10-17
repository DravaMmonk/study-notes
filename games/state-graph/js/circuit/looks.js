// The parts' looks: each one a little machine drawn like the robots (circuit/robots.js), on the same 32 × 32 grid and
// with the same pieces (a body, an antenna and its lamp, a base), so they share the robots' colours in every theme.
// What the part does is its face: a merger is a funnel with three pipes in, a gate a barrier, a constant a battery.

import { createElement } from 'react';

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
  /** A part built in an earlier level: a chip with pins all round. */
  part: look(`<path class="bot-arm" d="M3 12.5H7M3 19.5H7M25 12.5H29M25 19.5H29M12.5 3V7M19.5 3V7M12.5 25V29M19.5 25V29"/>
    <rect class="bot-head" x="7" y="7" width="18" height="18" rx="3.5"/>
    <path class="bot-eye-l" d="M16 11.5L20.5 16L16 20.5L11.5 16Z"/>`),
};

const markup = kind => PART_LOOKS[kind] ?? PART_LOOKS.part;

/** A part's look as SVG markup, for the mode's own HTML (sheets). */
export const lookSVG = (kind, cls = 'plook') => `<svg class="${cls}" viewBox="0 0 32 32" aria-hidden="true">${markup(kind)}</svg>`;

// A part's look as an icon component for the circuit kit (its Glyph draws a component at the size it asks for), one
// per part so React keeps it from render to render.
const icons = new Map();
export function lookIcon(kind) {
  const key = PART_LOOKS[kind] ? kind : 'part';
  if (!icons.has(key)) {
    const Icon = ({ size = 14 }) => createElement('svg', { className: 'plook', viewBox: '0 0 32 32', width: Math.round(size * 1.7), height: Math.round(size * 1.7), 'aria-hidden': true, dangerouslySetInnerHTML: { __html: markup(key) } });
    Icon.displayName = `PartLook(${key})`;
    icons.set(key, Icon);
  }
  return icons.get(key);
}
