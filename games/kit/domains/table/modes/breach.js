// Ch.7: draw two routes that make a counterexample.

import { reduced, buzz, ICON, toast } from '../util.js';
import { rcName } from '../algo.js';
import { E, W } from '../svg.js';
import { rt } from '../runtime.js';
import { tr, lazy } from '../i18n.js';

export function breachMode(L) {
  const w = L.world, kid = w.key.join(','), doors = new Set(w.doors.map(d => d.join(',')));
  const st = { A: [], B: [], active: 'A', msg: null, tries: 0 };
  const rc = id => id.split(',').map(Number), gotKey = route => route.includes(kid);
  const info = r => (st[r].length ? tr(`${st[r].length - 1} 步 · 停在${rcName(st[r].at(-1))} · ${gotKey(st[r]) ? '拿了钥匙' : '没拿钥匙'}`, `${st[r].length - 1} step${st[r].length === 2 ? '' : 's'} · at ${rcName(st[r].at(-1))} · ${gotKey(st[r]) ? 'has the key' : 'no key'}`) : tr('还没开始', 'not started'));
  return {
    st,
    save: () => ({}),
    scene() {
      const sp = 66, sz = 58, cells = [], edges = [], end = `${w.R - 1},${w.C - 1}`, tail = st[st.active].at(-1);
      for (let r = 0; r < w.R; r++) for (let c = 0; c < w.C; c++) {
        const id = `${r},${c}`, a = st.A.includes(id), b = st.B.includes(id);
        const cls = [id === kid ? 'key' : '', doors.has(id) ? 'door' : '', a && b ? 'rab' : a ? 'ra' : b ? 'rb' : '', id === tail ? 'sel' : ''];
        cells.push({ id, x: c * sp, y: r * sp, w: sz, h: sz, value: a && b ? 'A B' : a ? 'A' : b ? 'B' : '', label: id === kid ? W.key : doors.has(id) ? W.door : '', corner: id === '0,0' ? W.start : id === end ? W.end : '', cls: cls.filter(Boolean).join(' '), tap: true, aria: rcName(id) });
        if (c + 1 < w.C) edges.push(E(id, `${r},${c + 1}`, 'dim'));
        if (r + 1 < w.R) edges.push(E(id, `${r + 1},${c}`, 'dim'));
      }
      st.A.slice(1).forEach((id, q) => edges.push(E(st.A[q], id, 'ra', 0, -4)));
      st.B.slice(1).forEach((id, q) => edges.push(E(st.B[q], id, 'rb', 0, 4)));
      return { cells, edges };
    },
    boardOpt: () => ({ maxScale: 1.2 }),
    note: () => tr(`正在画路线 ${st.active}。点路线的最后一格可以撤销一步。`, `Drawing route ${st.active}. Click the route’s last cell to undo a step.`),
    onCell(id) {
      const route = st[st.active];
      st.msg = null;
      if (!route.length) {
        if (id !== '0,0') { toast(tr('路线要从左上角的起点出发', 'A route has to start from the top-left corner')); buzz(20); return; }
        route.push(id);
      } else {
        const last = route.at(-1);
        if (id === last) { route.pop(); rt.refresh(); return; }
        const [r0, c0] = rc(last), [r, c] = rc(id);
        if (!((r === r0 && c === c0 + 1) || (r === r0 + 1 && c === c0))) { toast(tr('只能从路线的最后一格，往右或往下走一格', 'You can only go one cell right or down from the route’s last cell')); buzz(20); return; }
        if (doors.has(id) && !gotKey(route)) { toast(tr('没有钥匙，过不了这扇门', 'Without the key you can’t get through this door')); buzz([20, 40, 20]); return; }
        route.push(id);
      }
      buzz(6);
      rt.refresh();
    },
    panel() {
      return `<div class="pcard"><h3>${tr('两条路线', 'Two routes')}</h3>
        <div class="chips two" role="radiogroup" aria-label="${tr('正在画的路线', 'Route being drawn')}">${['A', 'B'].map(r => `<button class="chip route-${r}" type="button" role="radio" aria-checked="${st.active === r}" data-act="route" data-r="${r}">${tr('路线', 'Route')} ${r}</button>`).join('')}</div>
        <div class="routes"><div class="route ra-line">A${tr('：', ': ')}${info('A')}</div><div class="route rb-line">B${tr('：', ': ')}${info('B')}</div></div>
        <button class="sec-btn" type="button" data-act="clear"${st[st.active].length ? '' : ' disabled'}>${tr(`清空路线 ${st.active}`, `Clear route ${st.active}`)}</button></div>
        ${st.msg ? `<div class="pcard"><h3>${tr('检验结果', 'Check result')}</h3><div class="msg ${st.msg.cls}">${st.msg.html}</div></div>` : ''}
        <div class="pcard"><h3>${tr('合格的反例', 'A valid counterexample')}</h3><p>${tr('1. 两条路线停在<b>同一格</b>：在计数器眼里，它们是同一个状态。<br>2. 一条<b>拿了钥匙</b>，一条<b>没拿</b>。<br>3. 从这一格往右或往下一步，<b>就是门</b>：它们的未来不同。', '1. Both routes stop on <b>the same cell</b>: to the counter, they are the same state.<br>2. One <b>has picked up the key</b>, the other <b>has not</b>.<br>3. One step right or down from that cell <b>is a door</b>: their futures differ.')}</p></div>`;
    },
    dock: () => ({ meta: tr(`正在画 <b>路线 ${st.active}</b>`, `Drawing <b>route ${st.active}</b>`), sec: st[st.active].length ? tr('撤销一步', 'Undo a step') : '', secAct: 'undo', go: tr('检验', 'Check'), act: 'check', goIcon: ICON.check }),
    act(name, el) {
      if (name === 'route') st.active = el.dataset.r;
      if (name === 'undo') { st[st.active].pop(); st.msg = null; }
      if (name === 'clear') { st[st.active] = []; st.msg = null; }
      if (name === 'check') { this.check(); return; }
      rt.refresh();
    },
    check() {
      const A = st.A, B = st.B, bad = (zh, en) => {
        const tries = ++st.tries;
        st.msg = { cls: 'bad', html: lazy(() => `${tr(zh(), en())}${tries >= 2 ? `<br><br><b>${tr('提示', 'Hint')}</b>${tr('：', ': ')}${L.hintText}` : ''}`) };
        buzz([20, 40, 20]);
        rt.refresh();
      };
      if (!A.length || !B.length) { bad(() => '先画好两条路线。在规则面板里切换 A 和 B。', () => 'Draw both routes first. Switch between A and B in the side panel.'); return; }
      const ea = A.at(-1), eb = B.at(-1);
      if (ea !== eb) { bad(() => `两条路线停在不同的格子：A 在${rcName(ea)}，B 在${rcName(eb)}。计数器当然分得清不同的格子，让它们停在同一格。`, () => `The routes stop on different cells: A at ${rcName(ea)}, B at ${rcName(eb)}. Of course the counter can tell different cells apart. Make them stop on the same cell.`); return; }
      const both = gotKey(A);
      if (gotKey(A) === gotKey(B)) { bad(() => `两条路线${both ? '都拿了' : '都没拿'}钥匙。它们不光状态相同，未来也一样，这不算破绽。让一条拿钥匙，另一条不拿。`, () => `${both ? 'Both routes have' : 'Neither route has'} the key. They share not only a state but also a future, so this is no flaw. Let one take the key and the other not.`); return; }
      const [r, c] = rc(ea), next = [`${r},${c + 1}`, `${r + 1},${c}`].filter(id => doors.has(id));
      if (!next.length) { bad(() => `它们在${rcName(ea)}汇合，一条有钥匙，一条没有。可从这里往右或往下一步都碰不到门，暂时还看不出区别。让它们在门的左边或上面汇合。`, () => `They meet at ${rcName(ea)}, one with the key and one without. But one step right or down from there never reaches a door, so there is no difference to see yet. Make them meet just left of or above a door.`); return; }
      const keyed = gotKey(A) ? 'A' : 'B', other = keyed === 'A' ? 'B' : 'A';
      st.msg = { cls: 'good', html: lazy(() => tr(`找到了！两条路线都停在${rcName(ea)}。路线 ${keyed} 带着钥匙，下一步能穿过${rcName(next[0])}的门；路线 ${other} 空着手，过不去。可在只记位置的计数器眼里，它们是同一个状态。`, `Found it! Both routes stop at ${rcName(ea)}. Route ${keyed} carries the key and can go through the door at ${rcName(next[0])} next; route ${other} is empty-handed and can’t. Yet to a counter that only remembers position, they are the same state.`)) };
      buzz(15);
      rt.refresh();
      setTimeout(rt.pass, reduced() ? 0 : 900);
    },
  };
}
