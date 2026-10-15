// Robot models: each one has a fixed vision (how many rings of cells around it can be lit as inputs) and its own look.
// Levels pick a model; the first level that uses a new model introduces it as an upgrade.

const look = body => `<g class="bot">${body}</g>`;

export const ROBOTS = {
  scout: {
    name: '小方', vision: 1,
    desc: '视野 3×3：看得见身边一圈的 8 个格子。',
    look: look(`<path class="bot-ant" d="M16 2.5V7"/><circle class="bot-lamp" cx="16" cy="2.6" r="2.2"/>
      <rect class="bot-head" x="5" y="7" width="22" height="16" rx="5"/>
      <circle class="bot-eye" cx="11.5" cy="15" r="2.4"/><circle class="bot-eye" cx="20.5" cy="15" r="2.4"/>
      <rect class="bot-base" x="8" y="24" width="16" height="5" rx="2.5"/>`),
  },
  ranger: {
    name: '远望', vision: 2,
    desc: '视野升级到 5×5：看得见身边两圈、24 个格子。',
    look: look(`<path class="bot-ant" d="M10 7L7 2M22 7L25 2"/><circle class="bot-lamp" cx="7" cy="2.4" r="1.8"/><circle class="bot-lamp" cx="25" cy="2.4" r="1.8"/>
      <rect class="bot-head" x="4" y="6" width="24" height="17" rx="4"/>
      <rect class="bot-visor" x="6.5" y="11" width="19" height="6.5" rx="3.2"/>
      <circle class="bot-eye-l" cx="12" cy="14.2" r="1.9"/><circle class="bot-eye-l" cx="20" cy="14.2" r="1.9"/>
      <rect class="bot-base" x="5" y="24" width="22" height="5.5" rx="2.7"/><path class="bot-tread" d="M9 26.7H23"/>`),
  },
  twin: {
    name: '双子', vision: 1,
    desc: '两个脑袋共用一个身体：同时站在上下两层的同一格上，每层都有 3×3 的视野。',
    look: look(`<path class="bot-ant" d="M9.5 3V7M22.5 3V7"/><circle class="bot-lamp" cx="9.5" cy="3" r="1.8"/><circle class="bot-lamp2" cx="22.5" cy="3" r="1.8"/>
      <rect class="bot-head" x="2.5" y="7" width="13" height="13" rx="4"/><rect class="bot-head" x="16.5" y="7" width="13" height="13" rx="4"/>
      <circle class="bot-eye" cx="7" cy="13.5" r="1.8"/><circle class="bot-eye" cx="11.5" cy="13.5" r="1.8"/>
      <circle class="bot-eye" cx="20.5" cy="13.5" r="1.8"/><circle class="bot-eye" cx="25" cy="13.5" r="1.8"/>
      <rect class="bot-base" x="6" y="22" width="20" height="7" rx="3"/>`),
  },
  reach: {
    name: '长臂', vision: 2, arm: true,
    desc: '视野 5×5，还多了一条伸缩臂：能往左伸出「这件物品的重量」那么多格，读到视野外面的格子。',
    look: look(`<path class="bot-ant" d="M20 2.5V7"/><circle class="bot-lamp" cx="20" cy="2.6" r="2.2"/>
      <rect class="bot-head" x="10" y="7" width="20" height="15" rx="5"/>
      <circle class="bot-eye" cx="16" cy="14.5" r="2.3"/><circle class="bot-eye" cx="24" cy="14.5" r="2.3"/>
      <path class="bot-arm" d="M11 18H4.5V11.5"/><path class="bot-claw" d="M2 9.5L4.5 11.5L7 9.5"/>
      <rect class="bot-base" x="12" y="23.5" width="16" height="5.5" rx="2.7"/>`),
  },
};
