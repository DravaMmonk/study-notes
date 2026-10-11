// Figures that a note can embed with an HTML comment on its own line: <!-- figure: conv-press -->
// Each module exports render() → card HTML and mount(root) → cleanup.
export const figures = {
  'conv-press': () => import('./conv/figure.js'),
  'stereo-rangefinder': () => import('./stereo/figure.js'),
  'ransac-pegboard': () => import('./ransac/figure.js'),
}
