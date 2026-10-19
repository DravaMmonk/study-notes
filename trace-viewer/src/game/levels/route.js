// The course route: each chapter is one era of the shared course layout (games/kit/course.js). The foundation is the
// main path; a `parallel` group splits it into series that all have to be passed, in any order, before it goes on.
// Challenges and topics are optional side branches, hung after the level whose parts and ideas they need (`after`).
export const ERAS = [
  {
    id: 0,
    foundation: ['0-1', '0-2', '0-3', '0-4', '0-5', '0-6', '0-7', '0-8'],
    challenges: [{ level: '0-9', after: '0-7' }],
    topics: [{ id: 'inspection', levels: ['0-10', '0-11', '0-12'], after: '0-7' }],
  },
  {
    id: 1,
    foundation: ['1-1', '1-2', '1-3', '1-4', '1-5', '1-6', '1-7', '1-8', '1-9', '1-10', '1-11', '1-12'],
    challenges: [{ level: '1-13', after: '1-3' }],
    topics: [{ id: 'scanner', levels: ['1-14', '1-15', '1-16'] }],
  },
  {
    id: 2,
    foundation: ['2-1', '2-2', { parallel: [{ id: 'probe', title: { zh: '频率探针', en: 'Frequency probe' }, levels: ['2-3', '2-4', '2-5'] }] }, '2-6', '2-7', '2-8', '2-9', '2-10', '2-11'],
    challenges: [{ level: '2-12', after: '2-10' }],
    topics: [{ id: 'thumbnails', levels: ['2-13', '2-14', '2-15', '2-16'], after: '2-11' }],
  },
  {
    id: 3,
    foundation: ['3-1', '3-2', '3-3', '3-4', '3-5', '3-6', '3-7', '3-8'],
    challenges: [{ level: '3-9' }],
    topics: [{ id: 'photometric', levels: ['3-10', '3-11', '3-12'], after: '3-7' }],
  },
  {
    id: 4,
    foundation: ['4-1', '4-2', '4-3', '4-4', '4-5', '4-6', '4-7', '4-8', '4-9', '4-10', '4-11', '4-12', '4-13', '4-14', '4-15'],
    challenges: [{ level: '4-16', after: '4-13' }],
    topics: [{ id: 'sorter', levels: ['4-17', '4-18', '4-19'] }],
  },
  {
    id: 5,
    foundation: ['5-1', '5-2', '5-3', '5-4', '5-5'],
    challenges: [{ level: '5-6' }],
    topics: [{ id: 'dedup', levels: ['5-7', '5-8', '5-9'], after: '5-1' }],
  },
  {
    id: 6,
    foundation: ['6-1', '6-2', '6-3', '6-4', '6-5', '6-6', '6-7', '6-8', '6-9'],
    challenges: [{ level: '6-10', after: '6-5' }],
    topics: [{ id: 'cover', levels: ['6-11', '6-12', '6-13'], after: '6-8' }],
  },
  {
    id: 7,
    foundation: ['7-1', '7-2', '7-3', '7-4', '7-5', '7-6', '7-7', '7-8'],
    challenges: [{ level: '7-9', after: '7-7' }],
    topics: [{ id: 'avoid', levels: ['7-10', '7-11', '7-12'], after: '7-3' }],
  },
  {
    id: 8,
    foundation: ['8-1', '8-2', '8-3', '8-4', '8-5', '8-6', '8-7', '8-8'],
    challenges: [{ level: '8-9', after: '8-5' }],
    topics: [{ id: 'restore', levels: ['8-10', '8-11'] }],
  },
  {
    id: 9,
    foundation: ['9-1', '9-2', '9-3', '9-4', '9-5', '9-6'],
    topics: [{ id: 'cells', levels: ['9-7', '9-8', '9-9'], after: '9-5' }],
  },
  {
    id: 10,
    foundation: ['10-1', '10-2', '10-3', '10-4', '10-5', '10-6', '10-7', '10-8'],
    topics: [{ id: 'shelf', levels: ['10-9', '10-10', '10-11'], after: '10-7' }],
  },
]

// Saves from before the chapters were rebuilt as loops (progress version 8): old id → new id, or null for a bench
// that became a different level.
export const RENAMED = {
  '0-3': '0-4', '0-4': '0-7', '0-5': '0-8',
  '1-2': '1-3', '1-3': '1-4', '1-9': '1-5', '1-4': '1-6', '1-5': '1-8', '1-6': '1-10', '1-R': '1-11', '1-7': '1-12', '1-8': '1-13',
  '2-1': null, '2-2': null, '2-4': null, '2-5': null, '2-7': '2-9', '2-8': '2-11', '2-9': '2-8',
  '4-1': null, '4-2': '4-3', '4-3': null, '4-4': '4-7', '4-5': null, '4-6': '4-11', '4-7': '4-10', '4-8': '4-13', '4-9': '4-12', '4-10': '4-17', '4-11': '4-15',
  '3-1': null, '3-2': null, '3-3': null, '3-4': '3-5', '3-5': null, '3-6': '3-7', '3-7': null,
}
