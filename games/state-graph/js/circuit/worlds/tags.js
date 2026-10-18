// Tagging a sentence: rows are parts of speech, columns are the words; one cell before the first word is the start.
// A cell holds the cheapest explanation of the words so far that gives this word this tag (costs), or, with o.prob,
// how likely the words so far are with this word in this tag (probabilities, summed over every way to get here).

import { E } from '../../svg.js';
import { T, tr, lazy } from '../../i18n.js';
import { world, look, cell, num, THIS_CELL } from '../world.js';

export const TAGS = ['N', 'V', 'A'];
export const TAG = { N: { n: T('名词', 'noun'), s: T('名', 'N') }, V: { n: T('动词', 'verb'), s: T('动', 'V') }, A: { n: T('形容词', 'adjective'), s: T('形', 'A') } };
/** 「a noun」, 「an adjective」. */
export const aTag = g => `${/^[aeiou]/.test(String(TAG[g].n)) ? 'an' : 'a'} ${TAG[g].n}`;

/**
 * t = { words, emit: [{ N?, V?, A? } per word] (a missing tag is impossible), trans: { from: { to } }, start: { tag } }.
 * The robot reaches back to the three cells of the previous word with its arm.
 */
export const tags = world({
  sensors: {
    ...Object.fromEntries(TAGS.map(g => [`p${g}`, cell(lazy(() => tr(`前词是${TAG[g].n}`, `previous word as ${aTag(g)}`)), lazy(() => tr(`前${TAG[g].s}`, `prev ${TAG[g].s}`)))])),
    ...Object.fromEntries(TAGS.map(g => [`t${g}`, num(lazy(() => tr(`跟在${TAG[g].n}后`, `after ${aTag(g)}`)), lazy(() => tr(`跟${TAG[g].s}`, `${TAG[g].s}→`)), `after${g}`)])),
    emit: num(T('这个词这么标', 'this word, this tag'), T('标', 'tag'), 'tag'),
  },
  facts: ['tN', 'tV', 'tA', 'emit'],
  armSensors: TAGS.map(g => `p${g}`),
  outs: [['cell', THIS_CELL, [0, 0, 0]]],
  here: (t, { r, c }) => [r, c],
  keyAt: (t, r, c) => (r >= 0 && r < TAGS.length && c >= 0 && c <= t.words.length && (c || !r) ? `${r},${c}` : null),
  mark: () => ({}),
  sense(t, { r, c }, id, get) {
    const tag = TAGS[r];
    if (id === 'emit') return t.emit[c - 1][tag] ?? null;
    // The first word comes straight from the start: only the first slot reaches back, with the start's cost.
    if (id[0] === 't') return c > 1 ? t.trans[id[1]][tag] : id[1] === TAGS[0] ? t.start[tag] : null;
    return c > 1 || id[1] === TAGS[0] ? get(`${c > 1 ? TAGS.indexOf(id[1]) : 0},${c - 1}`) : null;
  },
  arm: (t, { c }) => ({ label: c === 1 ? tr('前面是句首', 'the start of the sentence comes before') : tr(`「${t.words[c - 2]}」的三种词性`, `the three tags of “${t.words[c - 2]}”`), cells: TAGS.map((g, k) => ({ tap: `p${g}`, key: c > 1 ? `${k},${c - 1}` : k ? null : '0,0', label: c > 1 ? TAG[g].s : k ? '' : tr('首', 'start') })) }),
  base: (t, o) => [['0,0', o.prob ? 1 : 0]],
  order: t => { const o = []; for (let c = 1; c <= t.words.length; c++) TAGS.forEach((_, r) => o.push({ r, c, id: `${r},${c}` })); return o; },
  keys: (t, x) => ({ cell: x.id }),
  where: x => tr(`第 ${x.c} 个词当${TAG[TAGS[x.r]].n}`, `word ${x.c} as ${aTag(TAGS[x.r])}`),
  answerKeys: t => TAGS.map((_, k) => `${k},${t.words.length}`),
  answer(t, table, o) {
    const v = this.answerKeys(t).map(k => table.get(k)).filter(x => x !== null && x !== undefined);
    return !v.length ? null : o.prob ? Math.round(v.reduce((a, b) => a + b, 0) * 1e9) / 1e9 : Math.min(...v);
  },
  name: key => { const [r, c] = key.split(',').map(Number); return c ? tr(`第 ${c} 个词的「${TAG[TAGS[r]].n}」格`, `the “${TAG[TAGS[r]].n}” cell of word ${c}`) : tr('句首', 'sentence start'); },
  label: t => t.words.join(' '),
  orderText: () => tr('逐列，从第一个词开始', 'column by column, from the first word'),
  sample: t => ({ r: 1, c: Math.min(2, t.words.length), id: `1,${Math.min(2, t.words.length)}` }),
  scene(t, view, o = {}) {
    const g = look(view, [], this.base(t, o), o.bench), sp = 64, sz = 56, cells = [], texts = [], n = t.words.length;
    [tr('句首', 'start'), ...t.words].forEach((w, c) => cells.push({ id: `w${c}`, x: c * sp, y: -sp + 14, w: sz, h: 30, value: w, cls: `axis${c ? '' : ' axis0'}${String(w).length > 3 ? ' word' : ''}` }));
    const colMax = c => Math.max(...TAGS.map((_, r) => g.shown.get(`${r},${c}`) ?? 0)), path = o.path || [];
    TAGS.forEach((tag, r) => {
      texts.push({ x: -sz / 2 - 10, y: r * sp + 5, t: TAG[tag].n, anchor: 'end', cls: 'hd' });
      for (let c = r ? 1 : 0; c <= n; c++) {
        const id = `${r},${c}`, v = g.shown.get(id), em = c ? t.emit[c - 1][tag] : undefined;
        cells.push({
          id, x: c * sp, y: r * sp, w: sz, h: sz, value: g.val(id), corner: c ? (em === undefined ? '×' : em) : '', cls: [c ? '' : 'lit', g.cls(id), c && em === undefined ? 'dimc' : '', path.includes(id) ? 'path' : ''].filter(Boolean).join(' '),
          tap: c > 0 && g.tap(id), aria: this.name(id), ...(o.prob && c && typeof v === 'number' && colMax(c) > 0 ? { bar: v / colMax(c) } : {}),
        });
      }
    });
    const edges = g.arrows();
    for (let q = 0; q + 1 < path.length; q++) edges.push(E(path[q], path[q + 1], 'good'));
    return { cells, edges, texts, robot: g.robot };
  },
});
