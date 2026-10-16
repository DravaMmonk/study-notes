// Level mode registry: each level's `mode` names the controller that runs it.

import { wireMode } from './wire.js';
import { traceMode } from './trace.js';
import { fillMode } from './fill.js';
import { circuitMode } from './circuit.js';
import { backMode } from './back.js';
import { explodeMode } from './explode.js';
import { breachMode } from './breach.js';
import { linkMode } from './link.js';
import { packMode } from './pack.js';
import { matchMode } from './match.js';
import { askMode } from './ask.js';

export const MODES = { wire: wireMode, trace: traceMode, fill: fillMode, circuit: circuitMode, back: backMode, explode: explodeMode, breach: breachMode, link: linkMode, pack: packMode, match: matchMode, ask: askMode };
