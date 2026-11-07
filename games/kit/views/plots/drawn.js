import Plot from './Plot.jsx'
import Profile from './Profile.jsx'
import Slope from './Slope.jsx'
import Spectrum, { CentredBins } from './Spectrum.jsx'
import Surface from './Surface.jsx'

// The grid views drawn by a component of their own (the rest are a grid's cells, ../grid/), each taking
// { value, want, tolerance, card, size }, and the width a scene draws a picture at (a plot sizes itself).

export const DRAWN = { plot: Plot, profile: Profile, surface: Surface, slope: Slope, spectrum: Spectrum, centredBins: CentredBins }

export const SIZE = { card: 96, results: 180, detail: 200, figure: 260 }

/** Whether a view draws the result and the value wanted on one set of axes (else each is drawn on its own). */
export const overlays = (view, grid) => view === 'plot' || view === 'profile' || (['centredBins', 'spectrum'].includes(view) && grid?.h <= 2 && grid.frequencyAxes !== 2)
