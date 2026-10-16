// Ch.18: cut the seam — walk the cheapest seam back up the seam table by hand, cut it, then let the machine carve more,
// and compare the carved picture with one squeezed to the same width.

import { buzz, reduced, ICON } from '../util.js';
import { E, sceneSVG } from '../svg.js';
import { rt, Anim } from '../runtime.js';
import { seamTable, seamPath, shade } from '../circuit/worlds/picture.js';

const rc = id => id.split(',').map(Number);

export function seamMode(L) {
  const st = { img: L.img.map(r => r.slice()), cuts: 0, path: [], msg: null, auto: false };
  const table = () => seamTable(st.img), W = () => st.img[0].length, H = () => st.img.length;
  const top = () => st.path.length === H();
  const cut = path => { const by = new Map(path.map(([r, c]) => [r, c])); st.img = st.img.map((row, r) => row.filter((_, c) => c !== by.get(r))); st.cuts++; st.path = []; };
  /** Squeeze the original to `w` columns by dropping evenly spaced columns, as plain resizing would. */
  const squeeze = w => { const C = L.img[0].length, keep = Array.from({ length: w }, (_, k) => Math.round((k * (C - 1)) / Math.max(1, w - 1))); return L.img.map(row => keep.map(c => row[c])); };
  const thumb = (img, label) => {
    const px = 10, cells = img.flatMap((row, r) => row.map((v, c) => ({ id: `${r},${c}`, x: c * px, y: r * px, w: px, h: px, rx: 0, value: '', fill: shade(v), cls: 'px' })));
    return `<figure>${sceneSVG({ cells, edges: [] }, { pad: 2, maxScale: 1.6, label })}<figcaption>${label}</figcaption></figure>`;
  };

  function sceneOf() {
    // The picture on top, its seam table underneath, column for column.
    const { e, f } = table(), on = new Set(st.path.map(p => p.join())), cells = [], sp = 40, y0 = H() * sp + 34;
    const now = st.path.at(-1), opts = now && !top() ? [now[1] - 1, now[1], now[1] + 1].filter(c => c >= 0 && c < W()).map(c => `${now[0] - 1},${c}`) : !st.path.length && !st.auto ? f[H() - 1].map((_, c) => `${H() - 1},${c}`) : [];
    st.img.forEach((row, r) => row.forEach((v, c) => cells.push({ id: `p${r},${c}`, x: c * sp, y: r * sp, w: sp, h: sp, rx: 0, value: '', fill: shade(v), cls: on.has(`${r},${c}`) ? 'cut' : 'px' })));
    f.forEach((row, r) => row.forEach((v, c) => {
      const id = `${r},${c}`;
      cells.push({ id, x: c * sp, y: y0 + r * sp, w: sp - 4, h: sp - 4, rx: 7, value: v, corner: opts.includes(id) || (now && now.join() === id) ? `+${e[r][c]}` : '', cls: [on.has(id) ? 'path' : '', opts.includes(id) ? 'pred' : ''].filter(Boolean).join(' '), tap: opts.includes(id), aria: `第 ${r + 1} 行第 ${c + 1} 列` });
    }));
    const edges = [];
    for (let q = 0; q + 1 < st.path.length; q++) edges.push(E(st.path[q].join(), st.path[q + 1].join(), 'good'));
    return { cells, edges };
  }

  async function carve(n) {
    rt.startRun();
    for (let k = 0; k < n && W() > 2; k++) {
      st.path = seamPath(st.img);
      rt.renderBoard();
      rt.refresh();
      await Anim.wait(420);
      cut(st.path);
      rt.renderBoard();
      rt.refresh();
      await Anim.wait(160);
    }
    rt.endRun();
    rt.refresh();
    if (st.cuts >= L.cuts) setTimeout(rt.pass, reduced() ? 0 : 900);
  }

  return {
    st,
    save: () => ({}),
    scene: sceneOf,
    boardOpt: () => ({ minScale: 0.5, maxScale: 1 }),
    note() {
      if (st.auto) return st.cuts >= L.cuts ? `剪了 ${st.cuts} 条缝，图片从 ${L.img[0].length} 列变成了 ${W()} 列。` : `已经剪了 ${st.cuts} 条缝，图片现在 ${W()} 列宽。`;
      if (!st.path.length) return '上面是图片，下面是缝表：每格是「从顶行到这里，最省的缝要花多少能量」。正在看的格子角上，会标出这个像素自己的能量。先点最底一行里最小的那一格。';
      if (!top()) return '再往上一行：三个虚线框里，哪一格的数 + 当前格子的能量，正好等于当前格子的数？';
      return '这条缝找到了，图片上标红的就是它。点「剪掉」。';
    },
    after: () => (st.cuts >= L.cuts ? `<div class="afterbox"><span class="eyebrow">同样窄 ${st.cuts} 列</span><div class="orders thumbs">${thumb(L.img, '原图')}${thumb(st.img, '剪缝')}${thumb(squeeze(W()), '直接压扁')}</div><p class="cap">剪缝只拿掉不起眼的背景，字母原样留着；直接压扁时，每个字母都被挤变形了。</p></div>` : ''),
    panel: () => `<div class="pcard"><h3>剪缝<small>${st.cuts} / ${L.cuts} 条</small></h3><p>${st.auto ? '规则你已经会了：后面的缝交给机器去找、去剪。' : '第一条缝你来找：从最底一行最小的格子出发，一行一行往上倒推，就像第 6 章「原路找回」那样。'}</p>${st.msg ? `<div class="msg ${st.msg.cls}">${st.msg.html}</div>` : ''}</div>`,
    dock() {
      if (rt.cur.running) return { meta: `剪了 <b>${st.cuts}</b> 条`, go: '跳过动画', act: 'carve', busy: true };
      if (st.auto) return st.cuts >= L.cuts ? { meta: '剪完了' } : { meta: `剪了 <b>${st.cuts}</b> / ${L.cuts} 条`, sec: '再剪一条', secAct: 'one', go: '剪到够', act: 'carve', goIcon: ICON.skip };
      return top() ? { meta: '找到了一条缝', go: '剪掉', act: 'cut' } : { meta: `已经倒推了 <b>${Math.max(0, st.path.length - 1)}</b> 行`, sec: st.path.length ? '重新找' : '', secAct: 'again' };
    },
    onCell(id) {
      if (rt.cur.running || st.auto || top()) return;
      const { e, f } = table(), [r, c] = rc(id);
      if (!st.path.length) {
        const min = Math.min(...f[H() - 1]);
        if (f[r][c] !== min) { st.msg = { cls: 'bad', html: `这一格是 <b>${f[r][c]}</b>，最底一行最小的是 <b>${min}</b>。缝要花的能量越少越好。` }; buzz(20); rt.refresh(); return; }
        st.path.push([r, c]); st.msg = null; buzz(8); rt.refresh(); return;
      }
      const [r0, c0] = st.path.at(-1), need = f[r0][c0] - e[r0][c0];
      if (f[r][c] !== need) { st.msg = { cls: 'bad', html: `${f[r][c]} + ${e[r0][c0]} = <b>${f[r][c] + e[r0][c0]}</b>，不等于当前格子的 <b>${f[r0][c0]}</b>。缝不是从这里来的。` }; buzz(20); rt.refresh(); return; }
      st.path.push([r, c]);
      st.msg = top() ? { cls: 'good', html: '一直退到了顶行：这就是能量最小的那条缝。' } : null;
      buzz(8);
      rt.refresh();
    },
    act(name) {
      if (name === 'carve') { if (rt.cur.running) Anim.skip(); else carve(L.cuts - st.cuts); return; }
      if (rt.cur.running) return;
      if (name === 'again') { st.path = []; st.msg = null; rt.refresh(); }
      if (name === 'cut') { cut(st.path); st.auto = true; st.msg = { cls: 'good', html: '剪掉了！图片窄了一列。' }; buzz(15); rt.refresh(); }
      if (name === 'one') carve(1);
    },
  };
}
