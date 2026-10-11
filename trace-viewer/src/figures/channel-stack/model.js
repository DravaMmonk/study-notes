// Pure model for the channel punch: one convolutional layer, counted the way Lecture 6 counts it.
// A filter is K × K × C_in weights plus one bias; C_out filters give C_out activation maps.
// The drawn bed is 8 × 8 so the parts stay legible; the parameter counts use the note's 32 × 32 input.

export const DRAWN = 8 // pixel columns per side on the drawn bed
export const NOTE_N = 32 // the note's input: 32 × 32 × C_in

export const CHOICES = {
  cin: [1, 3, 4],
  k: [1, 3, 5],
  cout: [1, 3, 6],
}

export const DEFAULTS = { cin: 3, k: 5, cout: 6 }

// What each input channel is, bottom chip first (grey, RGB, RGB plus depth).
export const CHANNELS = { 1: ['灰度'], 3: ['R', 'G', 'B'], 4: ['R', 'G', 'B', 'D'] }

// Valid convolution, stride 1, no padding: N − K + 1 per side.
export const outSize = (n, k) => n - k + 1

export const perFilter = ({ cin, k }) => k * k * cin + 1

export const convParams = (config) => perFilter(config) * config.cout

// A fully-connected layer mapping the same input volume to the same output volume:
// every output number gets its own weight for every input number, plus its own bias.
export function fcParams({ cin, k, cout }, n = NOTE_N) {
  const inputs = n * n * cin
  const outputs = outSize(n, k) ** 2 * cout
  return (inputs + 1) * outputs
}

// Window order on the drawn bed: a serpentine raster, so the die never jumps back across a row.
export function windows(k) {
  const m = outSize(DRAWN, k)
  const list = []
  for (let i = 0; i < m; i++) {
    for (let step = 0; step < m; step++) list.push([i, i % 2 ? m - 1 - step : step])
  }
  return list
}

export const group = (value) => value.toLocaleString('en-US')

// Ten-thousands, the way the note reads large counts (1445.5 万).
export const wan = (value) => (value >= 1e4 ? `${(value / 1e4).toFixed(value >= 1e6 ? 0 : 1)} 万` : group(value))
