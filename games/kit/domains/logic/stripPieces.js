// Syntax is a domain resource. The game supplies the names, descriptions and IDs of the pieces that use it.
export const symbolFor = {
  formulaNot: '¬', formulaAnd: '∧', formulaOr: '∨', formulaImplies: '→', formulaIff: '↔',
  formulaFalse: '⊥', formulaForall: '∀', formulaExists: '∃',
}

/** Preserve the puzzle signature of the formula symbols a level introduces. */
export function symbolStamp(pieces) {
  return (key, value) => {
    if (key !== 'adds') return undefined
    const symbols = value.flatMap((id) => {
      const symbol = symbolFor[pieces[id]?.mark]
      return symbol ? [symbol] : []
    })
    return symbols.length ? ['symbols', symbols] : undefined
  }
}
