// A test's name, written in content as a template over the test's fields (a level's testLabel):
//   {R}            the field
//   {rocks.length} a list's length (any path through the test's objects)
//   {coins|、}     a list joined by what follows the bar

import { lazy } from '../lang.js';

const at = (t, path) => path.split('.').reduce((v, k) => (v == null ? v : k === 'length' ? v.length : v[k]), t);

/** The text of a template over test `t`, in the language shown when it is drawn. */
export const fill = (template, t) => lazy(() => String(template).replace(/\{([^}|]+)(?:\|([^}]*))?\}/g, (_, path, sep) => {
  const v = at(t, path);
  return Array.isArray(v) ? v.map(String).join(sep ?? ', ') : String(v);
}));
