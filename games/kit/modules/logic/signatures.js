import { S } from '../../engine/schema.js'

const parameter = (schema, defaultValue) => ({ ...schema, control: ({ str: 'tree', oneOf: 'select', list: 'list' })[schema.type], optional: true, default: defaultValue })
const text = (value = '') => parameter(S.str(), value)
const choice = (values, value = values[0]) => parameter(S.oneOf(values), value)
const fields = {
  impI: { A: text() },
  orI: { other: text(), side: choice(['left', 'right'], 'right') },
  botE: { C: text() },
  allI: { x: text() },
  allE: { t: text() },
  exI: { target: text() },
  exE: { x: text() },
  natInd: { P: text(), x: text() },
  refl: { t: text() },
  rewrite: { at: parameter(S.list(S.str()), []) },
  append: { ways: choice(['2', '3', '4', '5', '6'], '2') },
  search: { depth: choice(['any', '2', '3', '4', '5', '6', '8', '10', '12'], 'any') },
  rw: { at: choice(['goal', 'hyps'], 'goal') },
  resolve: { unit: choice(['any', 'unit'], 'any') },
  rules: { use: parameter(S.list(S.str()), []) },
}

const regions = { append: ['first', 'second', 'third', 'fourth', 'fifth', 'sixth'], each: ['body'], eachOf: ['body'], keepBound: ['body'], search: ['body'] }

/** Operation signatures describe the wire values and the card parameters read by each implementation. */
export function signatures(items, valueType) {
  return Object.fromEntries(Object.entries(items).map(([name, item]) => [name, {
    ...item,
    args: item.args.map((arg) => ({ ...arg, type: valueType })),
    returns: valueType,
    ...(regions[name] && { regions: regions[name].map(name => ({ name, type: valueType })) }),
    params: S.obj(fields[name] ?? {}),
  }]))
}
