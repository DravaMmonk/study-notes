// Fixed ports belong to the board. Grantable parts are the declared and runtime-registered node types.
export const partGrant = {
  type: 'part',
  used: (work, objects = {}) => (work?.nodes ?? []).filter(node => Object.hasOwn(objects, node.type)).map(node => node.type),
}
