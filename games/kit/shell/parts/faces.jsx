import { holesOf, outletsOf } from '../../engine/pieces.js'
import { applyRules, partDesc } from '../../engine/parts/define.js'
import PartFace, { blocksOf } from './PartFace.jsx'
import { iconOf } from './icons.js'

// What the shared editors and the circuit level need of defined parts (games/DESIGN.md 6.8): the cards' description
// for the editors (circuit/model.js), the parts to place, and the faces drawn by PartFace. A domain's level screen
// gives the circuit level `defined` = { of(type) → the part resolved or null, defaults(type), ops,
// value(node, ctx, output, face), widgets?, allowed?(type, key) }; the nodes it does not define (the level's own, built parts) stay the domain's.

/** The editor's description of a defined part's card, field by field (null where the type is not defined). */
export const definedCard = (def) => ({
  inputs: holesOf(def).map((p) => p.name),
  role: 'part',
  label: def.name,
  portLabel: (port) => holesOf(def).find((p) => p.name === port)?.label ?? port,
  family: def.family,
  icon: iconOf(def.icon),
  outputs: outletsOf(def).length ? outletsOf(def).map((o) => ({ key: o.name, label: o.label ?? o.name })) : null,
  cardWidth: def.width ?? null,
})

/**
 * The editor's description of a board's cards (circuit/model.js), defined parts drawn from their definitions and every
 * other node by `base` (the domain's own description of the level's nodes and the built parts).
 */
export function definedParts(base, of) {
  const field = (name, fallback) => (node, ...rest) => {
    const def = of(node.type)
    if (!def) return base[name]?.(node, ...rest) ?? fallback
    const v = definedCard(def)[name]
    return typeof v === 'function' ? v(...rest) : v ?? fallback
  }
  return {
    ...base,
    inputs: field('inputs', []),
    role: field('role', 'part'),
    label: field('label', ''),
    portLabel: field('portLabel', ''),
    family: field('family'),
    icon: field('icon'),
    outputs: field('outputs', null),
    cardWidth: field('cardWidth'),
    packed: (node) => (of(node.type) ? false : base.packed?.(node) ?? false),
  }
}

/** A defined part as the palette, the tray and an empty slot's sheet list it; `allowed(type, key)` the options open here. */
export const definedItem = (type, def, extra = {}, allowed = () => null) => ({ type, label: def.name, desc: partDesc(def, (key) => allowed(type, key)), icon: iconOf(def.icon), family: def.family, ...extra })

/** The settings a node is left with once the player set `patch` (changed: the key set, null for an action). */
export const nextParams = (def, params, patch, changed, ops) => applyRules(def, { ...params, ...patch }, changed, ops)

/**
 * The faces of defined parts over a domain's own (shell/CircuitLevel.jsx card): body (the card view), thumb and
 * tileExtra (the phone tile: its value blocks over the name, the rest under it), sheet (the detail view).
 */
export function definedFaces(faces, { defined, change, phone }) {
  const of = (node) => defined.of(node.type)
  const draw = (face, blocks) => (node, ctx) => {
    const def = of(node)
    const set = ctx.readOnly ? null : (patch, changed) => change(node, nextParams(def, node.params ?? {}, patch, changed, defined.ops))
    return <PartFace def={def} face={face} node={node} ctx={ctx} set={set} defined={defined} phone={phone} roomy={face === 'detail'} blocks={blocks?.(def)} />
  }
  const tile = (pick) => (def) => blocksOf(def, 'tile').filter(([b]) => pick(b.show === 'value'))
  const either = (mine, theirs) => (theirs ? (node, ctx) => (of(node) ? mine(node, ctx) : theirs(node, ctx)) : (node, ctx) => (of(node) ? mine(node, ctx) : null))
  return {
    ...faces,
    body: either(draw('card'), faces.body),
    thumb: either(draw('tile', tile((v) => v)), faces.thumb),
    tileExtra: either(draw('tile', tile((v) => !v)), faces.tileExtra),
    detail: either(draw('detail'), null),
  }
}
