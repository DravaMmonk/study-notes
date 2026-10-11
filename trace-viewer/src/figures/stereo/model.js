// Pure model for the stereo rangefinder: two rectified pinhole cameras, one target on the centre line.
// z = f·b / d, and a one-pixel disparity error moves the depth by about z² / (f·b).

export const FOCAL = 800 // px
export const DEPTH = [0.8, 6] // m
export const BASELINES = [0.06, 0.1, 0.16] // m

export function measure(depth, baseline) {
  const disparity = (FOCAL * baseline) / depth
  return {
    disparity,
    left: disparity / 2, // image x in the left camera, px, + is the camera's right
    right: -disparity / 2,
    near: (FOCAL * baseline) / (disparity + 1),
    far: disparity > 1 ? (FOCAL * baseline) / (disparity - 1) : Infinity,
    spread: (depth * depth) / (FOCAL * baseline),
  }
}
