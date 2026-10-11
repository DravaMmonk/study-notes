// Pure model for the camera obscura: a pinhole at the origin, the screen f behind it, an upright
// arrow X tall standing on the optical axis at depth Z in front. Similar triangles give x = −f·X/Z
// (the minus sign is the flip). A hole of diameter D spreads every point into a disc D·(Z + f)/Z
// wide on the screen, and lets in light in proportion to (D / f)².

export const ARROW = 100 // mm, the arrow above the axis
export const POST = 108 // mm, the post below the axis down to the carriage
export const DEPTH = [250, 600] // mm, pinhole to object
export const FOCALS = [50, 75, 100, 125, 150] // mm, pinhole to screen
export const HOLES = [0.5, 2, 6] // mm, the three holes in the stop slide

export const imageHeight = (f, Z, X = ARROW) => (-f * X) / Z
export const blurOf = (D, f, Z) => (D * (Z + f)) / Z
export const fNumber = (f, D) => f / D

// Screen brightness relative to the brightest setting (biggest hole, shortest screen).
export const brightness = (D, f) => (D / f) ** 2 / (HOLES[HOLES.length - 1] / FOCALS[0]) ** 2

export function view(f, Z, D) {
  return {
    image: imageHeight(f, Z),
    post: imageHeight(f, Z, -POST),
    magnification: f / Z,
    blur: blurOf(D, f, Z),
    stop: fNumber(f, D),
    light: brightness(D, f),
  }
}

export const mm = (value, digits = 1) => `${value < 0 ? '−' : ''}${Math.abs(value).toFixed(digits)} mm`
