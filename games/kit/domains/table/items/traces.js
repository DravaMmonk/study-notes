// The answers traced back through a table, drawn on the test board once a test passes (vocabulary.js trace): the
// cells walked back through (`path`) and, for a pair of strings, the letters matched on each (`okTop`, `okLeft`).

import { callOf } from '../../../engine/schema.js';
import { editTable, editTrace, knapTrace, lcsTable, lcsTrace, localTrace } from '../model/algo.js';
import { seamPath } from '../model/worlds/picture.js';
import { TAGS, bestTags } from '../model/worlds/tags.js';

const TRACES = {
  lcs(t) {
    const back = lcsTrace(t.top, t.left, lcsTable(t.top, t.left));
    return { path: back.cells.map(p => p.join(',')), okTop: new Set(back.pairs.map(p => p[0])), okLeft: new Set(back.pairs.map(p => p[1])) };
  },
  edit: t => ({ path: editTrace(t.left, t.top, editTable(t.left, t.top)).cells.map(p => p.join(',')) }),
  local: t => localTrace(t),
  knap: t => ({ path: knapTrace(t).cells }),
  seam: t => ({ path: seamPath(t.img).map(p => p.join()) }),
  tags: t => ({ path: bestTags(t).tags.map((g, k) => `${TAGS.indexOf(g)},${k + 1}`) }),
};

/** What a trace item draws on test `t`'s board. */
export function trace(call, t) {
  const [name] = callOf(call);
  return TRACES[name](t);
}
