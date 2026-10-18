// What a circuit reads, described the same way in every game. A sensor is one named value a level gives the circuit:
// in Vision Complete each input of a test (a picture, a waveform, a number), in State Graph each thing the robot can
// read on a cell (a board cell it sees, a fact about its own cell, what its arm brings in).
//
//   { id, label, short?, type, family?, icon?, named? }
//   label   what the player calls it ({ zh, en } or text)        short   a tag for tight spots (an output dot)
//   type    the signal it carries, in the game's terms (State Graph: num | bool | nums | bools | cat, a category with
//           `cats`; Vision Complete: image | signal | number)
//   family  where it comes from, when a game has more than one place (State Graph: view | here | arm)
//   named   the level named it itself (its card's title is that name, so the caption says it is an input)
//
// A game describes its inputs as sensors once; source cards, their captions and the inputs pane read them there.
import { L, tr } from '../shell/i18n.js'

export const sensor = (id, label, type, more = {}) => ({ id, label, type, ...more })

/** A sensor card's caption: that it is an input (when its title is the level's own name) and what it carries. */
export const sensorCaption = (s, kindName) => [s?.named ? tr('输入', 'input') : null, kindName ? L(kindName) : null].filter(Boolean).join(' · ')
