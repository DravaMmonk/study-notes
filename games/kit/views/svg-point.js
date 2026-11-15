function transform(x, y, matrix) {
  const point = new DOMPoint(x, y).matrixTransform(matrix)
  return [point.x, point.y]
}

/** Convert pointer coordinates to the SVG's local units, including its viewBox and any page transforms. */
export function clientToSvg(svg, { clientX, clientY }) {
  return transform(clientX, clientY, svg.getScreenCTM().inverse())
}

/** Project a local SVG point into viewport coordinates so another layer can draw through it. */
export function svgToClient(svg, [x, y]) {
  return transform(x, y, svg.getScreenCTM())
}
