/** Compare the serialized form, including the order of object keys and array entries. */
export const sameJson = (a, b) => JSON.stringify(a) === JSON.stringify(b)

/** Serialize JSON with stable object key order, preserving array order. */
export const canonicalJson = (value) => JSON.stringify(value, (_, field) => (
  field && typeof field === 'object' && !Array.isArray(field)
    ? Object.fromEntries(Object.keys(field).sort().map((key) => [key, field[key]]))
    : field
))
