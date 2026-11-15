/** Compare the serialized form, including the order of object keys and array entries. */
export const sameJson = (a, b) => JSON.stringify(a) === JSON.stringify(b)
