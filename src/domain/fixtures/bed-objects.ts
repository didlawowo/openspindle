import type {
  BedArea,
  BedMosaic,
  BedPhoto,
  PhotoPixels,
  PlanePoint,
} from "./bed-photo"
import type { BedShade, MachineCamera } from "./fixture-kit"

/*
 * What lies on the bed, found in the camera's photos of it: the cells of the view from above
 * (`BedMosaic`) that do not look like the bare bed, gathered into objects and each brought to a
 * rectangle. No photo of the empty bed is needed: the camera and the light are fixed to the
 * frame, so the bare bed is as bright at a given pixel of a photo wherever the bed stands, but
 * for the exposure the camera chose (`BedShade`, from the machine's kit).
 *
 * The view from above shows the bed's plane: what stands above it is seen further from the
 * camera than it is, so a rectangle is right only once the object's thickness is given
 * (`objectRectangle`).
 */

/** The view from above the photos were assembled into: its cells and the bed they cover. */
export type BedView = {
  readonly mosaic: BedMosaic
  readonly area: BedArea
  /** The side of a cell, in millimetres. */
  readonly cell: number
}

/** A rectangle of the bed's plane that fixtures of a kind fit in, its length the longer side. */
export type FootprintSize = { readonly length: number; readonly width: number }

/**
 * Something on the bed: stock when it is wider than the fixtures that hold stock, a fixture
 * when it is as narrow as one. Its cells are those of the view that show it, by their index
 * (row · columns + column).
 */
export type BedObject = {
  readonly kind: "stock" | "fixture"
  readonly cells: Uint32Array
}

/**
 * A rectangle on the bed: its middle, its sides (`length` the longer) and the angle from the
 * bed's X to its length, in degrees, from −90 to 90.
 */
export type BedRectangle = {
  readonly centre: PlanePoint
  readonly length: number
  readonly width: number
  readonly angle: number
}

/** How much brighter than the bare bed a cell is, in log luminance, to be on an object. */
const BRIGHTER = 0.3
/** The saturation (0 to 1) from which a cell is coloured, as the bare bed is not. */
const COLOURED = 0.2
/** The channel value from which a pixel is burnt out: brighter than the camera could tell. */
const BURNT = 250
/** How far from the level the back wall gives a cell may be and still be bare bed, in log. */
const NEAR_LEVEL = 0.25
/** The bare bed a photo must show, in mm², for its level to be taken from it. */
const LEVEL_AREA = 500
/** Specks smaller than this radius, in mm, are dropped, and gaps as small closed. */
const SPECK = 1.5
/** The radius, in mm, of the neighbourhood whose majority says whether a cell is coloured. */
const COLOUR_RADIUS = 2
/** The least area of stock, and of a fixture, in mm². */
const STOCK_AREA = 1000
const FIXTURE_AREA = 300
/** How far around stock, in mm, what is found belongs to the stock's edge and not to a fixture. */
const STOCK_EDGE = 2
/** The radius, in mm, a fixture's cells must fill around them. */
const FIXTURE_SPECK = 2.5
/** How near the view's edge, in mm, a fixture is not looked for: the bed's rim shows there. */
const RIM = 3
/** How much longer and wider than a kit's fixture what is found may be and still be one. */
const LONGER = 1.4
const WIDER = 1.5
/** The share of a rectangle's edge the object must fill for the edge to be the object's. */
const EDGE_FILL = 0.45
/** The gaps, in mm, closed in an object before its edges are looked at. */
const GAP = 2

/**
 * The objects on the bed the photos show: stock, wider than the widest of `fixtures`, then what
 * is as narrow and as long as one of them. None when the kit's camera does not say how the
 * bare bed looks.
 */
export function bedObjects(
  camera: MachineCamera,
  photos: readonly BedPhoto[],
  pictures: readonly PhotoPixels[],
  view: BedView,
  fixtures: readonly FootprintSize[]
): readonly BedObject[] {
  const { shade } = camera
  if (!shade) return []
  const { columns, rows } = view.mosaic
  const grid: Grid = { columns, rows }
  const radius = (millimetres: number) => millimetres / view.cell
  const count = (area: number) => area / (view.cell * view.cell)
  const look = cellLooks(camera, shade, photos, pictures, view)
  const found = closed(
    opened(look.object, grid, radius(SPECK)),
    grid,
    radius(SPECK)
  )
  const coloured = majority(
    look.coloured,
    grid,
    Math.round(radius(COLOUR_RADIUS))
  )
  const widest = Math.max(0, ...fixtures.map(({ width }) => width))
  const wide = radius(widest / 2 + 1)
  const stock = [true, false].flatMap((colour) => {
    const kind = found.map((on, cell) =>
      on && (coloured[cell] === 1) === colour ? 1 : 0
    )
    return components(opened(kind, grid, wide), grid).filter(
      (cells) => cells.length >= count(STOCK_AREA)
    )
  })
  const taken = new Uint8Array(columns * rows)
  for (const cells of stock) for (const cell of cells) taken[cell] = 1
  const aroundStock = dilated(taken, grid, radius(STOCK_EDGE))
  const rim = Math.ceil(radius(RIM))
  const narrow = found.map((on, cell) => {
    const column = cell % columns
    const row = Math.floor(cell / columns)
    const inside =
      column >= rim && column < columns - rim && row >= rim && row < rows - rim
    return on && inside && !aroundStock[cell] ? 1 : 0
  })
  const fixture = components(
    opened(narrow, grid, radius(FIXTURE_SPECK)),
    grid
  ).filter((cells) => {
    if (cells.length < count(FIXTURE_AREA)) return false
    const { length, width } = boundingRectangle(cellCentres(cells, view))
    return fixtures.some(
      (size) => length <= size.length * LONGER && width <= size.width * WIDER
    )
  })
  return [
    ...stock.map((cells): BedObject => ({ kind: "stock", cells })),
    ...fixture.map((cells): BedObject => ({ kind: "fixture", cells })),
  ]
}

/**
 * The rectangle an object `thickness` high covers on the bed. Each of its cells shows the
 * object's top where the bed's plane would be, further from the camera than the top is: the
 * cell is brought back toward the point under the lens of the photo that shows it, by the
 * share the thickness is of the lens's height. The rectangle is the smallest around those
 * points; stock's has each edge then moved in until the stock fills it (`EDGE_FILL`), so that
 * what sticks out of it, a clamp over its edge, does not widen it.
 */
export function objectRectangle(
  camera: MachineCamera,
  photos: readonly BedPhoto[],
  view: BedView,
  object: BedObject,
  thickness: number
): BedRectangle {
  const kept = 1 - thickness / camera.position[2]
  const points = cellCentres(object.cells, view).map(
    ([x, y], index): PlanePoint => {
      const photo = photos.at(view.mosaic.photo[object.cells[index]])
      if (!photo) return [x, y]
      const lensX = camera.position[0]
      const lensY = camera.position[1] + photo.spindleY
      return [lensX + (x - lensX) * kept, lensY + (y - lensY) * kept]
    }
  )
  // A fixture's slot empties its edges, and nothing is clamped onto a fixture.
  if (object.kind === "fixture") {
    // Around the cells' middles: half a cell short on every side.
    const around = boundingRectangle(points)
    return {
      centre: around.centre,
      length: around.length + view.cell,
      width: around.width + view.cell,
      angle: around.angle,
    }
  }
  return filledRectangle(points)
}

/** The middles of cells of the view, on the bed. */
function cellCentres(cells: Uint32Array, view: BedView): PlanePoint[] {
  const { columns } = view.mosaic
  return Array.from(cells, (cell): PlanePoint => [
    view.area.min[0] + ((cell % columns) + 0.5) * view.cell,
    view.area.max[1] - (Math.floor(cell / columns) + 0.5) * view.cell,
  ])
}

/*
 * How the cells look
 */

/** Per cell of the view: whether it shows an object, and whether it is coloured (1 or 0). */
type CellLooks = { readonly object: Uint8Array; readonly coloured: Uint8Array }

/** The log of a pixel's luminance, its channels taken as the camera's gamma encodes them. */
const logLuminance = (red: number, green: number, blue: number) =>
  Math.log(((red + green + blue) / 765) ** 2.2 + 1e-3)

/**
 * How much brighter than the bare bed each cell is, per photo levelled on the bare bed that
 * photo shows, and how coloured: a cell shows an object when it is brighter than the bare bed
 * by `BRIGHTER`, burnt out, or coloured.
 */
function cellLooks(
  camera: MachineCamera,
  shade: BedShade,
  photos: readonly BedPhoto[],
  pictures: readonly PhotoPixels[],
  view: BedView
): CellLooks {
  const { mosaic } = view
  const cells = mosaic.columns * mosaic.rows
  const above = new Float32Array(cells)
  const burnt = new Uint8Array(cells)
  const coloured = new Uint8Array(cells)
  for (let cell = 0; cell < cells; cell++) {
    const picture = pictures.at(mosaic.photo[cell])
    if (mosaic.photo[cell] < 0 || !picture) continue
    const u = mosaic.pixel[cell * 2]
    const v = mosaic.pixel[cell * 2 + 1]
    const from =
      (within(v, picture.height) * picture.width + within(u, picture.width)) * 4
    const [red, green, blue] = picture.data.subarray(from, from + 3)
    const brightest = Math.max(red, green, blue)
    burnt[cell] = brightest > BURNT ? 1 : 0
    coloured[cell] =
      (brightest - Math.min(red, green, blue)) / Math.max(brightest, 1) >
      COLOURED
        ? 1
        : 0
    above[cell] =
      logLuminance(red, green, blue) -
      bareBed(shade, u / picture.width - 0.5, v / picture.height - 0.5)
  }
  const levels = pictures.map((picture, index) => {
    const expected =
      wallLevel(shade, picture) + stopLevel(camera, shade, photos[index])
    const near: number[] = []
    for (let cell = 0; cell < cells; cell++) {
      const bare =
        mosaic.photo[cell] === index &&
        !burnt[cell] &&
        Math.abs(above[cell] - expected) < NEAR_LEVEL
      if (bare) near.push(above[cell])
    }
    const enough = near.length * view.cell * view.cell >= LEVEL_AREA
    return enough ? median(near) : expected
  })
  const object = new Uint8Array(cells)
  for (let cell = 0; cell < cells; cell++) {
    const photo = mosaic.photo[cell]
    if (photo < 0 || photo >= levels.length) continue
    const brighter = above[cell] - levels[photo] > BRIGHTER
    object[cell] = brighter || burnt[cell] || coloured[cell] ? 1 : 0
  }
  return { object, coloured }
}

/** The pixel a continuous coordinate falls in, among `count`. */
const within = (coordinate: number, count: number) =>
  Math.min(Math.max(Math.floor(coordinate), 0), count - 1)

/**
 * How bright the bare bed is at a place in a photo, from the picture's middle as a share of
 * its size, but for the photo's exposure: the kit's polynomial, in log luminance.
 */
function bareBed({ shading }: BedShade, u: number, v: number) {
  return (
    shading[0] * u +
    shading[1] * v +
    shading[2] * u * u +
    shading[3] * u * v +
    shading[4] * v * v
  )
}

/**
 * The exposure of a photo, read where it shows the machine's back wall, which never changes:
 * the median log luminance of the top `shade.wall` of the picture, burnt-out pixels left out.
 */
function wallLevel(shade: BedShade, picture: PhotoPixels) {
  const rows = Math.max(1, Math.round(picture.height * shade.wall))
  const seen: number[] = []
  for (let at = 0; at < rows * picture.width * 4; at += 4) {
    const [red, green, blue] = picture.data.subarray(at, at + 3)
    if (Math.max(red, green, blue) <= BURNT)
      seen.push(logLuminance(red, green, blue))
  }
  return seen.length ? median(seen) : 0
}

/** How much brighter than the wall the bare bed is at the stop a photo was taken nearest. */
function stopLevel(camera: MachineCamera, shade: BedShade, photo: BedPhoto) {
  const stops = camera.stops ?? []
  let nearest = 0
  stops.forEach((stop, index) => {
    const nearer =
      Math.abs(stop - photo.spindleY) <
      Math.abs(stops[nearest] - photo.spindleY)
    if (nearer) nearest = index
  })
  return shade.level.at(nearest) ?? 0
}

function median(values: number[]) {
  const sorted = Float64Array.from(values).sort()
  const middle = sorted.length >> 1
  return sorted.length % 2
    ? sorted[middle]
    : (sorted[middle - 1] + sorted[middle]) / 2
}

/*
 * Shapes of cells
 */

type Grid = { readonly columns: number; readonly rows: number }

/**
 * Per cell, the square of the distance, in cells, to the nearest cell that is `value` (1 or
 * 0), what is beyond the grid being 0: Felzenszwalb and Huttenlocher's transform, along the
 * rows then the columns.
 */
function squaredDistanceTo(
  mask: Uint8Array,
  { columns, rows }: Grid,
  value: 0 | 1
): Float64Array {
  const far = (columns + rows + 2) ** 2
  const out = new Float64Array(columns * rows)
  const line = new Float64Array(Math.max(columns, rows) + 2)
  // A line with a cell beyond each end: those are 0, the grid's outside.
  const along = (length: number, read: (at: number) => number) => {
    line[0] = value === 0 ? 0 : far
    line[length + 1] = line[0]
    for (let at = 0; at < length; at++) line[at + 1] = read(at)
    return lowerEnvelope(line, length + 2)
  }
  for (let row = 0; row < rows; row++) {
    const nearest = along(columns, (column) =>
      mask[row * columns + column] === value ? 0 : far
    )
    for (let column = 0; column < columns; column++)
      out[row * columns + column] = nearest[column + 1]
  }
  for (let column = 0; column < columns; column++) {
    const nearest = along(rows, (row) => out[row * columns + column])
    for (let row = 0; row < rows; row++)
      out[row * columns + column] = nearest[row + 1]
  }
  return out
}

/** Per place along a line, the least of `values[q] + (place − q)²` over its places q. */
function lowerEnvelope(values: Float64Array, length: number): Float64Array {
  const out = new Float64Array(length)
  const vertex = new Int32Array(length)
  const from = new Float64Array(length + 1)
  let last = 0
  from[0] = -Infinity
  from[1] = Infinity
  const crossing = (q: number, p: number) =>
    (values[q] + q * q - (values[p] + p * p)) / (2 * q - 2 * p)
  for (let q = 1; q < length; q++) {
    let at = crossing(q, vertex[last])
    while (at <= from[last]) {
      last -= 1
      at = crossing(q, vertex[last])
    }
    last += 1
    vertex[last] = q
    from[last] = at
    from[last + 1] = Infinity
  }
  let current = 0
  for (let place = 0; place < length; place++) {
    while (from[current + 1] < place) current += 1
    const q = vertex[current]
    out[place] = (place - q) * (place - q) + values[q]
  }
  return out
}

/** The cells whose every cell within `radius` is in the mask. */
function eroded(mask: Uint8Array, grid: Grid, radius: number): Uint8Array {
  const distance = squaredDistanceTo(mask, grid, 0)
  const limit = Math.round(radius) ** 2
  return mask.map((_, cell) => (distance[cell] > limit ? 1 : 0))
}

/** The cells within `radius` of a cell of the mask. */
function dilated(mask: Uint8Array, grid: Grid, radius: number): Uint8Array {
  const distance = squaredDistanceTo(mask, grid, 1)
  const limit = Math.round(radius) ** 2
  return mask.map((_, cell) => (distance[cell] <= limit ? 1 : 0))
}

/** The mask without what a disc of `radius` does not fit in. */
const opened = (mask: Uint8Array, grid: Grid, radius: number) =>
  dilated(eroded(mask, grid, radius), grid, radius)

/** The mask with the gaps a disc of `radius` does not fit in filled. */
const closed = (mask: Uint8Array, grid: Grid, radius: number) =>
  eroded(dilated(mask, grid, radius), grid, radius)

/** Per cell, whether most cells of the square `reach` cells around it are in the mask. */
function majority(mask: Uint8Array, grid: Grid, reach: number): Uint8Array {
  const { columns, rows } = grid
  // Sums over the rectangle above and left of each cell, one row and column wider.
  const sums = new Int32Array((columns + 1) * (rows + 1))
  for (let row = 0; row < rows; row++)
    for (let column = 0; column < columns; column++)
      sums[(row + 1) * (columns + 1) + column + 1] =
        mask[row * columns + column] +
        sums[row * (columns + 1) + column + 1] +
        sums[(row + 1) * (columns + 1) + column] -
        sums[row * (columns + 1) + column]
  return mask.map((_, cell) => {
    const column = cell % columns
    const row = Math.floor(cell / columns)
    const left = Math.max(0, column - reach)
    const right = Math.min(columns, column + reach + 1)
    const top = Math.max(0, row - reach)
    const bottom = Math.min(rows, row + reach + 1)
    const inMask =
      sums[bottom * (columns + 1) + right] -
      sums[top * (columns + 1) + right] -
      sums[bottom * (columns + 1) + left] +
      sums[top * (columns + 1) + left]
    return inMask * 2 > (right - left) * (bottom - top) ? 1 : 0
  })
}

/** The mask's cells gathered by touching sides, each group in the order the cells are met. */
function components(mask: Uint8Array, { columns, rows }: Grid): Uint32Array[] {
  const seen = new Uint8Array(mask.length)
  const groups: Uint32Array[] = []
  for (let start = 0; start < mask.length; start++) {
    if (!mask[start] || seen[start]) continue
    const group = [start]
    seen[start] = 1
    // The group grows as it is gone through: each cell met brings its neighbours.
    for (const cell of group) {
      const column = cell % columns
      const row = Math.floor(cell / columns)
      const beside = [
        column > 0 ? cell - 1 : -1,
        column < columns - 1 ? cell + 1 : -1,
        row > 0 ? cell - columns : -1,
        row < rows - 1 ? cell + columns : -1,
      ]
      for (const other of beside) {
        if (other < 0 || !mask[other] || seen[other]) continue
        seen[other] = 1
        group.push(other)
      }
    }
    groups.push(Uint32Array.from(group))
  }
  return groups
}

/*
 * Rectangles
 */

/** The convex hull of points, counter-clockwise: Andrew's monotone chain. */
function hull(points: readonly PlanePoint[]): PlanePoint[] {
  const sorted = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1])
  const half = (run: readonly PlanePoint[]) => {
    const chain: PlanePoint[] = []
    for (const point of run) {
      while (chain.length >= 2) {
        const [a, b] = [chain[chain.length - 2], chain[chain.length - 1]]
        const turn =
          (b[0] - a[0]) * (point[1] - a[1]) - (b[1] - a[1]) * (point[0] - a[0])
        if (turn > 0) break
        chain.pop()
      }
      chain.push(point)
    }
    chain.pop()
    return chain
  }
  return [...half(sorted), ...half(sorted.reverse())]
}

/** A rectangle and the unit vector along its length. */
type Framed = BedRectangle & { readonly along: PlanePoint }

/** The rectangle of least area around points: one of its sides lies along a side of their hull. */
function boundingRectangle(points: readonly PlanePoint[]): Framed {
  const corners = hull(points)
  let best: Framed = {
    centre: points.at(0) ?? [0, 0],
    length: 0,
    width: 0,
    angle: 0,
    along: [1, 0],
  }
  let least = Infinity
  corners.forEach((corner, index) => {
    const next = corners[(index + 1) % corners.length]
    const side = Math.hypot(next[0] - corner[0], next[1] - corner[1])
    if (side === 0) return
    const u: PlanePoint = [
      (next[0] - corner[0]) / side,
      (next[1] - corner[1]) / side,
    ]
    const span = spans(corners, u)
    const area = (span.maxU - span.minU) * (span.maxV - span.minV)
    if (area >= least) return
    least = area
    best = framed(span, u)
  })
  return best
}

/** How far points reach along a unit vector `u` and across it (`v`, a quarter turn on). */
function spans(points: readonly PlanePoint[], u: PlanePoint) {
  const span = {
    minU: Infinity,
    maxU: -Infinity,
    minV: Infinity,
    maxV: -Infinity,
  }
  for (const [x, y] of points) {
    const alongU = x * u[0] + y * u[1]
    const alongV = -x * u[1] + y * u[0]
    span.minU = Math.min(span.minU, alongU)
    span.maxU = Math.max(span.maxU, alongU)
    span.minV = Math.min(span.minV, alongV)
    span.maxV = Math.max(span.maxV, alongV)
  }
  return span
}

/** The rectangle of spans along `u` and across it from `origin`, its length along its longer side. */
function framed(
  span: ReturnType<typeof spans>,
  u: PlanePoint,
  origin: PlanePoint = [0, 0]
): Framed {
  const middleU = (span.minU + span.maxU) / 2
  const middleV = (span.minV + span.maxV) / 2
  const centre: PlanePoint = [
    origin[0] + middleU * u[0] - middleV * u[1],
    origin[1] + middleU * u[1] + middleV * u[0],
  ]
  const sizeU = span.maxU - span.minU
  const sizeV = span.maxV - span.minV
  const along: PlanePoint = sizeU >= sizeV ? u : [-u[1], u[0]]
  // The same line either way round: the direction is kept from −90° to 90°.
  const flipped = along[0] < 0 || (along[0] === 0 && along[1] < 0)
  const kept: PlanePoint = flipped ? [-along[0], -along[1]] : along
  return {
    centre,
    length: Math.max(sizeU, sizeV),
    width: Math.min(sizeU, sizeV),
    angle: (Math.atan2(kept[1], kept[0]) * 180) / Math.PI,
    along: kept,
  }
}

/**
 * The rectangle points fill to its edges: the least around them, drawn in millimetre squares
 * with its gaps closed and its holes filled, then each edge moved in while the points fill less
 * than `EDGE_FILL` of it.
 */
function filledRectangle(points: readonly PlanePoint[]): BedRectangle {
  const around = boundingRectangle(points)
  const u = around.along
  const v: PlanePoint = [-u[1], u[0]]
  // Room around the points for the closing, which reaches `GAP` beyond them and back.
  const margin = GAP + 1
  const grid: Grid = {
    columns: Math.ceil(around.length) + 2 * margin,
    rows: Math.ceil(around.width) + 2 * margin,
  }
  const drawn = new Uint8Array(grid.columns * grid.rows)
  for (const [x, y] of points) {
    const dx = x - around.centre[0]
    const dy = y - around.centre[1]
    const column = within(
      dx * u[0] + dy * u[1] + around.length / 2 + margin,
      grid.columns
    )
    const row = within(
      dx * v[0] + dy * v[1] + around.width / 2 + margin,
      grid.rows
    )
    drawn[row * grid.columns + column] = 1
  }
  const solid = withoutHoles(closed(drawn, grid, GAP), grid)
  const box = { left: 0, right: grid.columns, top: 0, bottom: grid.rows }
  const filled = (
    columns: readonly [number, number],
    rows: readonly [number, number]
  ) => {
    let inside = 0
    for (let row = rows[0]; row < rows[1]; row++)
      for (let column = columns[0]; column < columns[1]; column++)
        inside += solid[row * grid.columns + column]
    return inside / ((columns[1] - columns[0]) * (rows[1] - rows[0]))
  }
  for (;;) {
    if (box.right - box.left <= 4 || box.bottom - box.top <= 4) break
    const across = [box.left, box.right] as const
    const down = [box.top, box.bottom] as const
    if (filled(across, [box.top, box.top + 1]) < EDGE_FILL) box.top += 1
    else if (filled(across, [box.bottom - 1, box.bottom]) < EDGE_FILL)
      box.bottom -= 1
    else if (filled([box.left, box.left + 1], down) < EDGE_FILL) box.left += 1
    else if (filled([box.right - 1, box.right], down) < EDGE_FILL)
      box.right -= 1
    else break
  }
  // A point is drawn in the square it falls in, half a millimetre past it either way.
  const alongU = (box.left + box.right) / 2 - margin - around.length / 2 - 0.5
  const alongV = (box.top + box.bottom) / 2 - margin - around.width / 2 - 0.5
  return framed(
    {
      minU: alongU - (box.right - box.left) / 2,
      maxU: alongU + (box.right - box.left) / 2,
      minV: alongV - (box.bottom - box.top) / 2,
      maxV: alongV + (box.bottom - box.top) / 2,
    },
    u,
    around.centre
  )
}

/** The mask with the cells it encloses: all but those reached from the grid's edge. */
function withoutHoles(mask: Uint8Array, grid: Grid): Uint8Array {
  const { columns, rows } = grid
  const edge = mask.map((on, cell) => {
    const column = cell % columns
    const row = Math.floor(cell / columns)
    const onEdge =
      column === 0 || row === 0 || column === columns - 1 || row === rows - 1
    return !on && onEdge ? 1 : 0
  })
  const outside = new Uint8Array(mask.length)
  const empty = mask.map((on) => (on ? 0 : 1))
  for (const group of components(empty, grid)) {
    if (!group.some((cell) => edge[cell])) continue
    for (const cell of group) outside[cell] = 1
  }
  return outside.map((out) => (out ? 0 : 1))
}
