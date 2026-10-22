// The course route: each chapter is one era of the shared course layout (games/kit/course.js). The foundation is the
// main path; a `parallel` group splits it into series that all have to be passed, in any order, before it goes on.
// Challenges and topics are optional side branches, hung after the level whose parts and ideas they need (`after`).
// A named series on the main path, as one branch of a `parallel` set.
const series = (id, zh, en, levels) => ({ id, title: { zh, en }, levels })

// Every chapter works on the same image pipeline (its filters, arithmetic and thresholds are what later chapters
// are built from), so each one keeps 'all'.
export const ERAS = [
  {
    id: 0,
    foundation: ['0-1', { parallel: [series('move', '挪动', 'Moving', ['0-2', '0-3']), series('tone', '明暗', 'Light and dark', ['0-4', '0-5', '0-6'])] }, '0-7', '0-8'],
    challenges: [{ level: '0-9', after: '0-7' }],
    topics: [{ id: 'inspection', levels: ['0-10', '0-11', '0-12'], after: '0-7' }],
  },
  {
    id: 1, keeps: 'all',
    foundation: [
      '1-1', '1-2', '1-3', '1-4',
      { parallel: [series('sharpen', '锐化', 'Sharpening', ['1-5']), series('edges', '找边', 'Finding edges', ['1-6', '1-7'])] },
      { parallel: [series('kernel', '3×3 核', 'The 3×3 kernel', ['1-8', '1-9', '1-10']), series('border', '图的边上', 'At the border', ['1-11', '1-12'])] },
    ],
    challenges: [{ level: '1-13', after: '1-3' }],
    topics: [{ id: 'scanner', levels: ['1-14', '1-15', '1-16'] }],
  },
  {
    id: 2, keeps: 'all',
    foundation: [
      '2-1', '2-2',
      { parallel: [series('probe', '频率探针', 'Frequency probe', ['2-3', '2-4', '2-5'])] },
      '2-6',
      { parallel: [series('filter', '滤波', 'Filtering', ['2-7', '2-8', '2-9', '2-10']), series('sampling', '采样', 'Sampling', ['2-11'])] },
    ],
    challenges: [{ level: '2-12', after: '2-10' }],
    topics: [{ id: 'thumbnails', levels: ['2-13', '2-14', '2-15', '2-16'] }],
  },
  {
    id: 3, keeps: 'all',
    foundation: [
      { parallel: [series('light', '光照', 'Lighting', ['3-1', '3-2']), series('camera', '相机', 'The camera', ['3-3', '3-4'])] },
      { parallel: [series('colour', '只看颜色', 'Colour alone', ['3-5', '3-6']), series('slope', '只看坡度', 'Slope alone', ['3-7', '3-8'])] },
    ],
    challenges: [{ level: '3-9' }],
    topics: [{ id: 'photometric', levels: ['3-10', '3-11', '3-12'], after: '3-7' }],
  },
  {
    id: 4, keeps: 'all',
    foundation: [
      '4-1', '4-2', '4-3', '4-4',
      { parallel: [series('neuron', '神经元', 'The neuron', ['4-5', '4-6']), series('pool', '非线性和池化', 'Nonlinearity and pooling', ['4-7', '4-8', '4-10', '4-11']), series('conv', '卷积层', 'Convolution layers', ['4-9', '4-13', '4-14'])] },
      '4-12', '4-15',
    ],
    challenges: [{ level: '4-16', after: '4-13' }],
    topics: [{ id: 'sorter', levels: ['4-17', '4-18', '4-19'] }],
  },
  {
    id: 5, keeps: 'all',
    foundation: ['5-1', { parallel: [series('mend', '补全', 'Mending', ['5-2', '5-3', '5-4']), series('order', '位置', 'Position', ['5-5'])] }],
    challenges: [{ level: '5-6' }],
    topics: [{ id: 'dedup', levels: ['5-7', '5-8', '5-9'], after: '5-1' }],
  },
  {
    id: 6, keeps: 'all',
    foundation: [
      { parallel: [series('corners', '角点', 'Corners', ['6-1', '6-2', '6-3']), series('match', '匹配', 'Matching', ['6-4', '6-5'])] },
      { parallel: [series('vote', '投票', 'Voting', ['6-6', '6-7']), series('consensus', '共识', 'Consensus', ['6-8'])] },
      '6-9',
    ],
    challenges: [{ level: '6-10', after: '6-5' }],
    topics: [{ id: 'cover', levels: ['6-11', '6-12', '6-13'], after: '6-8' }],
  },
  {
    id: 7, keeps: 'all',
    foundation: [{ parallel: [series('disparity', '视差', 'Disparity', ['7-1', '7-2', '7-3', '7-4']), series('lines', '点和线', 'Points and lines', ['7-5', '7-6'])] }, '7-7', '7-8'],
    challenges: [{ level: '7-9', after: '7-7' }],
    topics: [{ id: 'avoid', levels: ['7-10', '7-11', '7-12'], after: '7-3' }],
  },
  {
    id: 8, keeps: 'all',
    foundation: [
      '8-1',
      { parallel: [series('autoencoder', '自编码器', 'Autoencoders', ['8-2', '8-3']), series('sample', '抽样', 'Sampling', ['8-4', '8-5'])] },
      { parallel: [series('adversary', '对抗', 'Adversaries', ['8-6']), series('diffusion', '扩散', 'Diffusion', ['8-7', '8-8'])] },
    ],
    challenges: [{ level: '8-9', after: '8-5' }],
    topics: [{ id: 'restore', levels: ['8-10', '8-11'] }],
  },
  {
    id: 9, keeps: 'all',
    foundation: [{ parallel: [series('upsample', '放大', 'Upsampling', ['9-1', '9-2', '9-3', '9-4']), series('cluster', '分类', 'Grouping', ['9-5', '9-6'])] }],
    topics: [{ id: 'cells', levels: ['9-7', '9-8', '9-9'] }],
  },
  {
    id: 10, keeps: 'all',
    foundation: [
      { parallel: [series('iou', '重叠', 'Overlap', ['10-1', '10-2']), series('ap', '排名', 'Ranking', ['10-3', '10-4'])] },
      { parallel: [series('anchors', '锚框', 'Anchor boxes', ['10-5', '10-6']), series('window', '滑窗', 'Sliding window', ['10-7'])] },
      '10-8',
    ],
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
