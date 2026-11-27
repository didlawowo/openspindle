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
  const shift = ([x, y, pz]: Point3): Point3 => [x, y + photo.spindleY, pz]
  const eye = shift(camera.position)
  const forward = unit(minus(shift(camera.target), eye))
  const right = unit(cross(forward, [0, 0, 1]))
  const up = cross(right, forward)
  const fov = pictureFov(camera, photo.width / photo.height)
  const focal = photo.height / 2 / Math.tan((fov * Math.PI) / 360)
  const cx = photo.width / 2
  const cy = photo.height / 2
  // A bed point p = (x, y, z) seen from the eye: d = p − eye = x·X + y·Y + (z − eye)·1.
  const column = (d: Point3): Point3 => {
    const depth = dot(d, forward)
    return [
      cx * depth + focal * dot(d, right),
      cy * depth - focal * dot(d, up),
      depth,
    ]
  }
  const ex = column([1, 0, 0])
  const ey = column([0, 1, 0])
  const e0 = column([-eye[0], -eye[1], z - eye[2]])
  return [ex[0], ey[0], e0[0], ex[1], ey[1], e0[1], ex[2], ey[2], e0[2]]
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
  const w = matrix[6] * x + matrix[7] * y + matrix[8]
  if (w <= 0) return null
  const point: PlanePoint = [
    (matrix[0] * x + matrix[1] * y + matrix[2]) / w,
    (matrix[3] * x + matrix[4] * y + matrix[5]) / w,
  ]
  return point
}

/** How many of the photo's pixels cover a square millimetre of the plane at a bed point. */
export function pixelsPerSquareMillimetre(matrix: Matrix3, [x, y]: PlanePoint) {
  const w = matrix[6] * x + matrix[7] * y + matrix[8]
  if (w <= 0) return 0
  return Math.abs(determinant(matrix) / (w * w * w))
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
  readonly photo: Int8Array
  /** Per cell, row by row: the pixel it shows in that photo, X then Y. */
  readonly pixel: Float32Array
}

/** The rectangle of the bed's plane a mosaic covers, from its lowest to its highest corner. */
export type BedArea = { readonly min: PlanePoint; readonly max: PlanePoint }

/**
 * Where the photos show a bed point best: in the photo where it covers the most pixels, among
 * those whose picture it is inside. Null when no photo shows it.
 */
export function samplePhotos(
  matrices: readonly Matrix3[],
  photos: readonly BedPhoto[],
  point: PlanePoint
): PhotoSample | null {
  let best: PhotoSample | null = null
  let density = 0
  for (const [index, matrix] of matrices.entries()) {
    const pixel = mapPoint(matrix, point)
    if (!pixel || !inside(photos[index], pixel)) continue
    const here = pixelsPerSquareMillimetre(matrix, point)
    if (here <= density) continue
    density = here
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
  const columns = Math.max(0, Math.ceil((area.max[0] - area.min[0]) / cell))
  const rows = Math.max(0, Math.ceil((area.max[1] - area.min[1]) / cell))
  const photo = new Int8Array(columns * rows).fill(-1)
  const pixel = new Float32Array(columns * rows * 2)
  for (let row = 0; row < rows; row++) {
    const y = area.max[1] - (row + 0.5) * cell
    for (let column = 0; column < columns; column++) {
      const x = area.min[0] + (column + 0.5) * cell
      const sample = samplePhotos(matrices, photos, [x, y])
      if (!sample) continue
      const index = row * columns + column
      photo[index] = sample.photo
      pixel[index * 2] = sample.pixel[0]
      pixel[index * 2 + 1] = sample.pixel[1]
    }
  }
  return { columns, rows, photo, pixel }
}

const inside = ({ width, height }: BedPhoto, [x, y]: PlanePoint) =>
  x >= 0 && x <= width && y >= 0 && y <= height

const minus = (a: Point3, b: Point3): Point3 => [
  a[0] - b[0],
  a[1] - b[1],
  a[2] - b[2],
]

const dot = (a: Point3, b: Point3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]

const cross = (a: Point3, b: Point3): Point3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
]

const unit = (a: Point3): Point3 => {
  const length = Math.hypot(a[0], a[1], a[2])
  return [a[0] / length, a[1] / length, a[2] / length]
}

function determinant(m: Matrix3) {
  return (
    m[0] * (m[4] * m[8] - m[5] * m[7]) -
    m[1] * (m[3] * m[8] - m[5] * m[6]) +
    m[2] * (m[3] * m[7] - m[4] * m[6])
  )
}

function invert(m: Matrix3): Matrix3 {
  const d = determinant(m)
  return [
    (m[4] * m[8] - m[5] * m[7]) / d,
    (m[2] * m[7] - m[1] * m[8]) / d,
    (m[1] * m[5] - m[2] * m[4]) / d,
    (m[5] * m[6] - m[3] * m[8]) / d,
    (m[0] * m[8] - m[2] * m[6]) / d,
    (m[2] * m[3] - m[0] * m[5]) / d,
    (m[3] * m[7] - m[4] * m[6]) / d,
    (m[1] * m[6] - m[0] * m[7]) / d,
    (m[0] * m[4] - m[1] * m[3]) / d,
  ]
}
