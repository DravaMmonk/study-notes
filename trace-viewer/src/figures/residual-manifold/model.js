// Pure model for the residual manifold: the scalar picture of backpropagation through a stack of
// blocks (Lecture 8, ResNet). The gradient reaching the input is the product of each block's slope.
// A plain block must carry the whole mapping H(x); here its slope is taken as 0.6, so the product
// shrinks like 0.6^L. A residual block outputs F(x) + x, so its slope is 1 + g′: the shortcut adds
// exactly 1, and the branch F only learns the residual H(x) − x, whose slope g′ is small.

export const PLAIN = 0.6
// Residual branch slopes g′ for blocks 1…8 counted from the input: small, of either sign.
export const BRANCH = [0.06, -0.04, 0.05, -0.07, 0.03, -0.05, 0.08, -0.03]
export const DEPTHS = [2, 4, 8]

export const factorOf = (n, skip) => (skip ? 1 + BRANCH[n] : PLAIN)

export const factors = (depth, skip) => Array.from({ length: depth }, (_, n) => factorOf(n, skip))

// Gradient arriving at the input of block n (0 = first block after the network input):
// the loss end starts at 1, and every block from the last back to n multiplies it.
export const gradientAt = (depth, skip, n) => factors(depth, skip).slice(n).reduce((product, f) => product * f, 1)

export const atInput = (depth, skip) => gradientAt(depth, skip, 0)

export const format = (value) => (value >= 0.095 ? value.toFixed(2) : value.toPrecision(2))
