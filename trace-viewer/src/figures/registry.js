// Figures that a note can embed with an HTML comment on its own line: <!-- figure: conv-press -->
// Each figure lives in src/figures/<folder>/figure.js and exports meta (with its id), render() → card
// HTML, mount(root) → cleanup, and optionally css. Folders are discovered, so adding one needs no edit here.
const modules = import.meta.glob('./*/figure.js')

const ids = {
  './conv/figure.js': 'conv-press',
  './stereo/figure.js': 'stereo-rangefinder',
  './ransac/figure.js': 'ransac-pegboard',
}

// New figures use their folder name as id.
export const figures = Object.fromEntries(
  Object.entries(modules).map(([path, load]) => [ids[path] ?? path.split('/')[1], load]),
)
