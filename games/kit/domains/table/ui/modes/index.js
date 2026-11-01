// The play modes (vocabulary.js mode): each level's `mode` names the controller that plays it.

import { traceMode } from './trace.js';
import { fillMode } from './fill.js';
import { circuitMode } from './circuit.js';
import { breachMode } from './breach.js';
import { linkMode } from './link.js';
import { packMode } from './pack.js';
import { policyMode } from './policy.js';
import { seamMode } from './seam.js';

export const MODES = { trace: traceMode, fill: fillMode, circuit: circuitMode, breach: breachMode, link: linkMode, pack: packMode, policy: policyMode, seam: seamMode };
