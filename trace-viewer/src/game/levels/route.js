// The course route: each chapter is one era of the shared course layout (games/kit/course.js). A chapter runs its
// steps in order (each new part, then the practice that stretches it), then an optional challenge, then its series:
// smaller versions of the finale, each adding back one mechanism, ending on the finale itself.
export const ERAS = [
  {
    id: 0,
    foundation: ['0-1', '0-2', '0-3', '0-4', '0-5', '0-6', '0-7', '0-8'],
    challenges: [{ level: '0-9' }],
    topics: [{ id: 'inspection', levels: ['0-10', '0-11', '0-12'] }],
  },
  {
    id: 1,
    foundation: ['1-1', '1-2', '1-3', '1-4', '1-5', '1-6', '1-7', '1-8', '1-9', '1-10', '1-11', '1-12'],
    challenges: [{ level: '1-13' }],
    topics: [{ id: 'scanner', levels: ['1-14', '1-15', '1-16'] }],
  },
  {
    id: 2,
    foundation: ['2-1', '2-2', '2-3', '2-4', '2-5', '2-6', '2-7', '2-8', '2-9'],
    challenges: [{ level: '2-10' }],
    topics: [{ id: 'thumbnails', levels: ['2-11', '2-12', '2-13', '2-14'] }],
  },
  {
    id: 3,
    foundation: ['3-1', '3-2', '3-3', '3-4', '3-5', '3-6', '3-7', '3-8'],
    challenges: [{ level: '3-9' }],
    topics: [{ id: 'photometric', levels: ['3-10', '3-11', '3-12'] }],
  },
  {
    id: 4,
    foundation: ['4-1', '4-2', '4-3', '4-4', '4-5', '4-6', '4-7', '4-8', '4-9', '4-10', '4-11', '4-12', '4-13', '4-14', '4-15'],
    challenges: [{ level: '4-16' }],
    topics: [{ id: 'sorter', levels: ['4-17', '4-18', '4-19'] }],
  },
  {
    id: 5,
    foundation: ['5-1', '5-2', '5-3', '5-4', '5-5'],
    challenges: [{ level: '5-6' }],
    topics: [{ id: 'dedup', levels: ['5-7', '5-8', '5-9'] }],
  },
  {
    id: 6,
    foundation: ['6-1', '6-2', '6-3', '6-4', '6-5', '6-6', '6-7', '6-8', '6-9'],
    challenges: [{ level: '6-10' }],
    topics: [{ id: 'cover', levels: ['6-11', '6-12', '6-13'] }],
  },
  {
    id: 7,
    foundation: ['7-1', '7-2', '7-3', '7-4', '7-5', '7-6', '7-7', '7-8'],
    challenges: [{ level: '7-9' }],
    topics: [{ id: 'avoid', levels: ['7-10', '7-11', '7-12'] }],
  },
  {
    id: 8,
    foundation: ['8-1', '8-2', '8-3', '8-4', '8-5', '8-6', '8-7', '8-8'],
    challenges: [{ level: '8-9' }],
    topics: [{ id: 'restore', levels: ['8-10', '8-11'] }],
  },
  {
    id: 9,
    foundation: ['9-1', '9-2', '9-3', '9-4', '9-5', '9-6'],
    topics: [{ id: 'cells', levels: ['9-7', '9-8', '9-9'] }],
  },
  {
    id: 10,
    foundation: ['10-1', '10-2', '10-3', '10-4', '10-5', '10-6', '10-7', '10-8'],
    topics: [{ id: 'shelf', levels: ['10-9', '10-10', '10-11'] }],
  },
]

/** Each chapter's levels in play order: its steps, its challenges, then its series. */
export const chapterOrder = (era) => [...era.foundation, ...(era.challenges ?? []).map((c) => c.level), ...(era.topics ?? []).flatMap((t) => t.levels)]

/** The map draws a chapter's steps, challenges and series as groups split by dashed lines. */
export const chapterGroups = (era) => [era.foundation, (era.challenges ?? []).map((c) => c.level), ...(era.topics ?? []).map((t) => t.levels)].filter((g) => g.length)

// Saves from before the chapters were rebuilt as loops (progress version 8): old id → new id, or null for a bench
// that became a different level.
export const RENAMED = {
  '0-3': '0-4', '0-4': '0-7', '0-5': '0-8',
  '1-2': '1-3', '1-3': '1-4', '1-9': '1-5', '1-4': '1-6', '1-5': '1-8', '1-6': '1-10', '1-R': '1-11', '1-7': '1-12', '1-8': '1-13',
  '2-1': null, '2-2': null, '2-4': null, '2-5': null, '2-7': '2-9', '2-8': '2-11', '2-9': '2-8',
  '4-1': null, '4-2': '4-3', '4-3': null, '4-4': '4-7', '4-5': null, '4-6': '4-11', '4-7': '4-10', '4-8': '4-13', '4-9': '4-12', '4-10': '4-17', '4-11': '4-15',
  '3-1': null, '3-2': null, '3-3': null, '3-4': '3-5', '3-5': null, '3-6': '3-7', '3-7': null,
}
