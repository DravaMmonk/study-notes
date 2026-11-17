// Syntax is a domain resource. The game supplies the names, descriptions and IDs of the parts that use it.
export const symbolFor = Object.fromEntries(Object.entries({
  formulaNot: '¬', formulaAnd: '∧', formulaOr: '∨', formulaImplies: '→', formulaIff: '↔',
  formulaFalse: '⊥', formulaForall: '∀', formulaExists: '∃',
}).map(([name, symbol]) => [`logic:mark-${name}`, symbol]))

/** Preserve the puzzle signature of the formula symbols a level introduces. */
export function symbolStamp(parts) {
  return (key, value) => {
    if (key !== 'adds') return undefined
    const symbols = value.flatMap((id) => {
      const symbol = symbolFor[parts[id]?.mark]
      return symbol ? [symbol] : []
    })
    return symbols.length ? ['symbols', symbols] : undefined
  }
}
