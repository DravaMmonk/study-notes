// Ports of the parts meant for any table (index.js registerBlueprint): a name of their own, and the sensor the level
// that builds the part wires there, for the check that the part does what its board did (validate.js).

import { T } from '../i18n.js';

export const port = (label, short, type, sensor = null) => ({ label, short, type, sensor });
export const WAY = (n, sensor) => port(T(`来路${'一二三四'[n]}`, `way in ${n + 1}`), 'abcd'[n], 'num', sensor);
export const START = sensor => port(T('起点', 'start'), T('起', 'start'), 'bool', sensor);
