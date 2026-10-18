// Robot models: each one has a fixed vision (how many rings of cells around it can be lit as inputs) and its own look.
// Levels pick a model; the first level that uses a new model introduces it as an upgrade.

import { T } from '../i18n.js';

const look = body => `<g class="bot">${body}</g>`;

export const ROBOTS = {
  scout: {
    name: T('小方', 'Boxy'), vision: 1,
    desc: T('视野 3×3：看得见身边一圈的 8 个格子。', 'Vision 3×3: it sees the ring of 8 cells around it.'),
    look: look(`<path class="bot-ant" d="M16 2.5V7"/><circle class="bot-lamp" cx="16" cy="2.6" r="2.2"/>
      <rect class="bot-head" x="5" y="7" width="22" height="16" rx="5"/>
      <circle class="bot-eye" cx="11.5" cy="15" r="2.4"/><circle class="bot-eye" cx="20.5" cy="15" r="2.4"/>
      <rect class="bot-base" x="8" y="24" width="16" height="5" rx="2.5"/>`),
  },
  ranger: {
    name: T('远望', 'Farsight'), vision: 2,
    desc: T('视野升级到 5×5：看得见身边两圈、24 个格子。', 'Vision upgraded to 5×5: it sees two rings around it, 24 cells.'),
    look: look(`<path class="bot-ant" d="M10 7L7 2M22 7L25 2"/><circle class="bot-lamp" cx="7" cy="2.4" r="1.8"/><circle class="bot-lamp" cx="25" cy="2.4" r="1.8"/>
      <rect class="bot-head" x="4" y="6" width="24" height="17" rx="4"/>
      <rect class="bot-visor" x="6.5" y="11" width="19" height="6.5" rx="3.2"/>
      <circle class="bot-eye-l" cx="12" cy="14.2" r="1.9"/><circle class="bot-eye-l" cx="20" cy="14.2" r="1.9"/>
      <rect class="bot-base" x="5" y="24" width="22" height="5.5" rx="2.7"/><path class="bot-tread" d="M9 26.7H23"/>`),
  },
  twin: {
    name: T('双子', 'Gemini'), vision: 1,
    desc: T('两个脑袋共用一个身体：同时站在上下两层的同一格上，每层都有 3×3 的视野。', 'Two heads on one body: it stands on the same cell of the upper and lower layer at once, with 3×3 vision on each.'),
    look: look(`<path class="bot-ant" d="M9.5 3V7M22.5 3V7"/><circle class="bot-lamp" cx="9.5" cy="3" r="1.8"/><circle class="bot-lamp2" cx="22.5" cy="3" r="1.8"/>
      <rect class="bot-head" x="2.5" y="7" width="13" height="13" rx="4"/><rect class="bot-head" x="16.5" y="7" width="13" height="13" rx="4"/>
      <circle class="bot-eye" cx="7" cy="13.5" r="1.8"/><circle class="bot-eye" cx="11.5" cy="13.5" r="1.8"/>
      <circle class="bot-eye" cx="20.5" cy="13.5" r="1.8"/><circle class="bot-eye" cx="25" cy="13.5" r="1.8"/>
      <rect class="bot-base" x="6" y="22" width="20" height="7" rx="3"/>`),
  },
  reach: {
    name: T('长臂', 'Longarm'), vision: 2, arm: true, armName: T('伸缩臂', 'telescopic arm'),
    desc: T('视野 5×5，还多了一条伸缩臂：能往左伸出「这件物品的重量」那么多格，读到视野外面的格子。', "Vision 5×5, plus a telescopic arm: it reaches left by as many cells as “this item's weight” and reads cells outside its view."),
    look: look(`<path class="bot-ant" d="M20 2.5V7"/><circle class="bot-lamp" cx="20" cy="2.6" r="2.2"/>
      <rect class="bot-head" x="10" y="7" width="20" height="15" rx="5"/>
      <circle class="bot-eye" cx="16" cy="14.5" r="2.3"/><circle class="bot-eye" cx="24" cy="14.5" r="2.3"/>
      <path class="bot-arm" d="M11 18H4.5V11.5"/><path class="bot-claw" d="M2 9.5L4.5 11.5L7 9.5"/>
      <rect class="bot-base" x="12" y="23.5" width="16" height="5.5" rx="2.7"/>`),
  },
  broom: {
    name: T('扫帚', 'Broom'), vision: 1, arm: true, armName: T('扫描臂', 'sweep arm'),
    desc: T('视野 3×3，还带一条扫描臂：一次扫过一整段格子，把整段的数一起送进电路板，段里有几格都行。', 'Vision 3×3, plus a sweep arm: it sweeps a whole run of cells in one go and feeds every number in the run into the circuit board, however many cells the run has.'),
    look: look(`<path class="bot-ant" d="M16 2.5V7"/><circle class="bot-lamp" cx="16" cy="2.6" r="2.2"/>
      <rect class="bot-head" x="8" y="7" width="20" height="15" rx="5"/>
      <circle class="bot-eye" cx="14" cy="14.5" r="2.2"/><circle class="bot-eye" cx="22" cy="14.5" r="2.2"/>
      <path class="bot-arm" d="M8.5 19H2.5"/><path class="bot-claw" d="M1.5 15V23M4 15V23"/>
      <rect class="bot-base" x="10" y="23.5" width="16" height="5.5" rx="2.7"/>`),
  },
  stack: {
    name: T('千层', 'Layercake'), vision: 1, arm: true, armName: T('探针', 'probe'),
    desc: T('能同时站在很多层上：表有几层，它就在每一层的同一格上各算一次。每一层都有 3×3 的视野；在捡钥匙的格子上，探针还能探到「少一把这种钥匙的那一层」的上面和左边。', 'It stands on many layers at once: however many layers the table has, it works once on the same cell of each. Every layer has a 3×3 view; on a cell where a key is picked up, its probe also reaches up and left on “the layer with one key fewer”.'),
    look: look(`<path class="bot-ant" d="M16 1.5V5"/><circle class="bot-lamp" cx="16" cy="2" r="1.9"/>
      <rect class="bot-head" x="5" y="5" width="22" height="8" rx="3"/><rect class="bot-head" x="5" y="13.5" width="22" height="8" rx="3"/>
      <circle class="bot-eye" cx="12" cy="9" r="1.7"/><circle class="bot-eye" cx="20" cy="9" r="1.7"/>
      <circle class="bot-eye-l" cx="12" cy="17.5" r="1.7"/><circle class="bot-eye-l" cx="20" cy="17.5" r="1.7"/>
      <rect class="bot-base" x="7" y="23" width="18" height="6" rx="3"/>`),
  },
};
