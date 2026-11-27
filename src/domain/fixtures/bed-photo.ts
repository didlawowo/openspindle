import type { Point3 } from "@/domain/nc/gcode"
import { pictureFov } from "./fixture-kit"
import type { MachineCamera } from "./fixture-kit"

/*
 * The bed as the machine's camera photographs it, worked out from the camera the machine's kit
 * describes (`FixtureKit.camera`), with no picture decoded and nothing drawn.
 *
 * A photo's pixels are continuous: (0, 0) is its top-left corner, (width, height) its
 * bottom-right, the pixel in column i and row j covers i to i + 1 and j to j + 1, and the
 * picture's middle is on the camera's axis. That is how three.js draws the view through the
 * camera (`bed-scene.ts`, `placeLens`) and how a texture is sampled.
 */

/** A 3 × 3 matrix, by rows. */
export type Matrix3 = readonly [
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
]

/** A point on the bed in X and Y, or in a photo in pixels. */
export type PlanePoint = readonly [number, number]

/**
 * A photo the camera took: its size in pixels, and where the spindle was along the bed's Y, in
 * bed coordinates. The camera is fixed to the frame and the bed moves along Y under it, so the
 * camera is as far along the bed as the spindle is; the machine's firmware gives the spindle's
 * place on the bed from its machine position (`FirmwareModel.bedPosition`).
 */
export type BedPhoto = {
  readonly width: number
  readonly height: number
  readonly spindleY: number
}

/**
 * The homography from the bed's plane at height `z` (bed X, Y) to the photo's pixels, as the
 * camera's lens projects it: position and target moved along Y by the spindle's place, Z up,
 * and the photo's vertical field of view from its shape (`pictureFov`).
 */
export function bedToPhoto(
  camera: MachineCamera,
  photo: BedPhoto,
  z = 0
): Matrix3 {
  const forward = unit(minus(camera.target, camera.position))
  const right = unit(cross(forward, [0, 0, 1]))
  const up = cross(right, forward)
  const fov = pictureFov(camera, photo.width / photo.height)
  const focal = photo.height / 2 / Math.tan((fov * Math.PI) / 360)
  // A bed point p = (x, y, z) seen from the eye, which is as far along Y as the spindle:
  // d = p − eye = x·X + y·Y + (z − eye)·1.
  const column = (d: Point3): Point3 => {
    const depth = dot(d, forward)
    return [
      (photo.width / 2) * depth + focal * dot(d, right),
      (photo.height / 2) * depth - focal * dot(d, up),
      depth,
    ]
  }
  return fromColumns(
    column([1, 0, 0]),
    column([0, 1, 0]),
    column(minus([0, -photo.spindleY, z], camera.position))
  )
}

/** The homography from the photo's pixels back to the bed's plane at height `z`. */
export function photoToBed(
  camera: MachineCamera,
  photo: BedPhoto,
  z = 0
): Matrix3 {
  return invert(bedToPhoto(camera, photo, z))
}

/**
 * Where a homography takes a point, or null when the point is behind the camera (from bed to
 * photo) or the pixel's ray never meets the plane (from photo to bed).
 */
export function mapPoint(matrix: Matrix3, [x, y]: PlanePoint) {
  const [u, v, w] = [0, 3, 6].map((start) =>
    dot(rowOf(matrix, start), [x, y, 1])
  )
  if (w <= 0) return null
  const point: PlanePoint = [u / w, v / w]
  return point
}

/** Where a bed point is in one of the photos. */
export type PhotoSample = {
  /** Which photo, by its place in the list given. */
  readonly photo: number
  readonly pixel: PlanePoint
}

/**
 * A view of the bed's plane from above, assembled from photos: what each of its cells shows.
 * Cell (column, row) is the square of side `cell` whose centre is at bed X
 * `area.min[0] + (column + 0.5) · cell` and bed Y `area.max[1] − (row + 0.5) · cell`: X to the
 * right and Y up, as the bed is seen from above, row 0 at the top.
 */
export type BedMosaic = {
  readonly columns: number
  readonly rows: number
  /** Per cell, row by row: the photo it shows, or −1 when none shows it. */
  readonly photo: Int16Array
  /** Per cell, row by row: the pixel it shows in that photo, X then Y. */
  readonly pixel: Float32Array
}

/** The rectangle of the bed's plane a mosaic covers, from its lowest to its highest corner. */
export type BedArea = { readonly min: PlanePoint; readonly max: PlanePoint }

/**
 * Where the photos show a bed point best: in the photo where it is nearest the picture's
 * centre, among those whose picture it is inside. Photos of a bed that slid under a fixed
 * camera show a point at nearly the same scale, so the centre decides: there the camera looks
 * at the point most squarely, and what stands above the plane is shifted least. Null when no
 * photo shows it.
 */
export function samplePhotos(
  matrices: readonly Matrix3[],
  photos: readonly BedPhoto[],
  point: PlanePoint
): PhotoSample | null {
  let best: PhotoSample | null = null
  let nearest = Infinity
  for (const [index, matrix] of matrices.entries()) {
    const pixel = mapPoint(matrix, point)
    if (!pixel) continue
    const here = fromCentre(photos[index], pixel)
    if (!(here.edge <= 1 && here.distance < nearest)) continue
    nearest = here.distance
    best = { photo: index, pixel }
  }
  return best
}

/**
 * Assembles photos of the bed's plane at height `z` into a view from above (`BedMosaic`), with
 * cells of side `cell` millimetres over `area`: each cell shows the photo that sees it best.
 */
export function bedMosaic(
  camera: MachineCamera,
  photos: readonly BedPhoto[],
  area: BedArea,
  cell: number,
  z = 0
): BedMosaic {
  const matrices = photos.map((photo) => bedToPhoto(camera, photo, z))
  const count = (span: number) =>
    cell > 0 ? Math.max(0, Math.ceil(span / cell)) : 0
  const columns = count(area.max[0] - area.min[0])
  const rows = count(area.max[1] - area.min[1])
  const samples = Array.from({ length: columns * rows }, (_, index) =>
    samplePhotos(matrices, photos, [
      area.min[0] + ((index % columns) + 0.5) * cell,
      area.max[1] - (Math.floor(index / columns) + 0.5) * cell,
    ])
  )
  return {
    columns,
    rows,
    photo: Int16Array.from(samples, (sample) => sample?.photo ?? -1),
    pixel: Float32Array.from(
      samples.flatMap((sample) => sample?.pixel ?? [0, 0])
    ),
  }
}

/**
 * Where a pixel is from the middle of its photo, as a share of the photo's half size: how far,
 * and how far along the axis it is furthest on (1 or less inside the picture).
 */
function fromCentre({ width, height }: BedPhoto, [x, y]: PlanePoint) {
  const across = (2 * x) / width - 1
  const down = (2 * y) / height - 1
  return {
    distance: Math.hypot(across, down),
    edge: Math.max(Math.abs(across), Math.abs(down)),
  }
}

const minus = (a: Point3, b: Point3): Point3 => [
  a[0] - b[0],
  a[1] - b[1],
  a[2] - b[2],
]

const scaled = (a: Point3, k: number): Point3 => [a[0] * k, a[1] * k, a[2] * k]

const unit = (a: Point3) => scaled(a, 1 / Math.hypot(...a))

const dot = (a: Point3, b: Point3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]

const cross = (a: Point3, b: Point3): Point3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
]

/** The matrix whose columns are a, b and c. */
const fromColumns = (a: Point3, b: Point3, c: Point3): Matrix3 => [
  a[0],
  b[0],
  c[0],
  a[1],
  b[1],
  c[1],
  a[2],
  b[2],
  c[2],
]

/** The row of a matrix that begins at index `start`. */
const rowOf = (m: Matrix3, start: number): Point3 => [
  m[start],
  m[start + 1],
  m[start + 2],
]

/** The inverse: the adjugate's columns are the cross products of the rows. */
function invert(m: Matrix3): Matrix3 {
  const [a, b, c] = [rowOf(m, 0), rowOf(m, 3), rowOf(m, 6)]
  const k = 1 / dot(a, cross(b, c))
  return fromColumns(
    scaled(cross(b, c), k),
    scaled(cross(c, a), k),
    scaled(cross(a, b), k)
  )
}
