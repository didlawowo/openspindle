import { describe, expect, test } from "vitest"
import {
  bedMosaic,
  bedToPhoto,
  jogToward,
  mapPoint,
  mosaicPixels,
  photoToBed,
  samplePhotos,
  shootingOrder,
} from "./bed-photo"
import type { BedPhoto, Matrix3, PlanePoint } from "./bed-photo"
import type { MachineCamera } from "./fixture-kit"
import { MakeraZ1 } from "./makera-z1/makera-z1"

/*
 * A camera 100 mm above the bed's origin looking along X, 45° down, with a 90° vertical field
 * of view over a 2:1 picture: in a 200 × 100 photo the focal length is 50 pixels, X runs away
 * from the camera, up the picture, and Y runs to the left.
 */
const level: MachineCamera = {
  position: [0, 0, 100],
  target: [100, 0, 0],
  fov: 90,
  aspect: 2,
}
const wide: BedPhoto = { width: 200, height: 100, spindleY: 0 }

/** An oblique camera, so that no axis of its view lines up with the bed's. */
const oblique: MachineCamera = {
  position: [-60, -12, 85],
  target: [45, 7, -4],
  fov: 50,
  aspect: 4 / 3,
}
const vga: BedPhoto = { width: 640, height: 480, spindleY: 0 }

type Vector = readonly [number, number, number]

const sub = (a: Vector, b: Vector): Vector => [
  a[0] - b[0],
  a[1] - b[1],
  a[2] - b[2],
]
const along = (a: Vector, b: Vector) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
const normal = (a: Vector, b: Vector): Vector => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
]
const normalized = (a: Vector): Vector => {
  const length = Math.sqrt(along(a, a))
  return [a[0] / length, a[1] / length, a[2] / length]
}

/**
 * A pinhole camera's view of a bed point, worked out on its own: the eye is moved along Y with
 * the spindle, `focal` is in pixels, and the picture's middle is on the camera's axis.
 */
function project(
  camera: MachineCamera,
  photo: BedPhoto,
  focal: number,
  point: Vector
): PlanePoint {
  const moved = (p: Vector): Vector => [p[0], p[1] + photo.spindleY, p[2]]
  const eye = moved(camera.position)
  const forward = normalized(sub(moved(camera.target), eye))
  const right = normalized(normal(forward, [0, 0, 1]))
  const up = normal(right, forward)
  const d = sub(point, eye)
  const depth = along(d, forward)
  return [
    photo.width / 2 + (focal * along(d, right)) / depth,
    photo.height / 2 - (focal * along(d, up)) / depth,
  ]
}

/** The focal length in pixels of a photo `height` high seen with a vertical field of view. */
const focalOf = (height: number, fovDegrees: number) =>
  height / 2 / Math.tan((fovDegrees * Math.PI) / 360)

function expectPixel(actual: PlanePoint | null, expected: PlanePoint) {
  expect(actual).not.toBeNull()
  expect(actual?.[0]).toBeCloseTo(expected[0], 6)
  expect(actual?.[1]).toBeCloseTo(expected[1], 6)
}

function multiply(a: Matrix3, b: Matrix3) {
  return Array.from({ length: 9 }, (_, index) => {
    const row = Math.floor(index / 3)
    const column = index % 3
    return (
      a[row * 3] * b[column] +
      a[row * 3 + 1] * b[3 + column] +
      a[row * 3 + 2] * b[6 + column]
    )
  })
}

describe("mapPoint", () => {
  test("applies the homography and divides by its last row", () => {
    const matrix: Matrix3 = [2, 1, 3, -1, 4, 5, 0.5, 0.25, 2]
    // w = 0.5·2 + 0.25·4 + 2 = 4
    expect(mapPoint(matrix, [2, 4])).toEqual([
      (4 + 4 + 3) / 4,
      (-2 + 16 + 5) / 4,
    ])
  })

  test("returns null on the plane through the eye and behind it", () => {
    const matrix: Matrix3 = [1, 0, 0, 0, 1, 0, 1, 0, -2]
    expect(mapPoint(matrix, [2, 7])).toBeNull()
    expect(mapPoint(matrix, [1, 7])).toBeNull()
    expect(mapPoint(matrix, [4, 7])).toEqual([2, 3.5])
  })
})

describe("bedToPhoto", () => {
  test("puts the camera's target in the middle of the picture", () => {
    expectPixel(mapPoint(bedToPhoto(level, wide), [100, 0]), [100, 50])
  })

  test("projects the bed as the camera sees it", () => {
    const matrix = bedToPhoto(level, wide)
    // Straight below the eye, the ray is 45° below the axis: the picture's bottom edge.
    expectPixel(mapPoint(matrix, [0, 0]), [100, 100])
    // 50 mm to the left of the target, 100·√2 mm away.
    expectPixel(mapPoint(matrix, [100, 50]), [
      100 - 2500 / (100 * Math.SQRT2),
      50,
    ])
    expectPixel(mapPoint(matrix, [200, 0]), [100, 50 - 50 / 3])
  })

  test("agrees with a pinhole projection for an oblique camera", () => {
    const focal = focalOf(vga.height, oblique.fov)
    const matrix = bedToPhoto(oblique, vga)
    for (const point of [
      [40, 0],
      [10, -30],
      [70, 25],
      [-5, 12],
    ] as const) {
      expectPixel(
        mapPoint(matrix, point),
        project(oblique, vga, focal, [point[0], point[1], 0])
      )
    }
  })

  test("follows the spindle along Y and the plane's height", () => {
    const photo = { ...vga, spindleY: 35 }
    const focal = focalOf(vga.height, oblique.fov)
    const matrix = bedToPhoto(oblique, photo, 6)
    for (const point of [
      [30, 40],
      [60, 10],
    ] as const) {
      expectPixel(
        mapPoint(matrix, point),
        project(oblique, photo, focal, [point[0], point[1], 6])
      )
    }
  })

  test("narrows the field of view for a picture wider than the camera's", () => {
    // A 4:1 picture from a 2:1 camera keeps its width: half the vertical field's tangent.
    const photo: BedPhoto = { width: 400, height: 100, spindleY: 0 }
    expectPixel(
      mapPoint(bedToPhoto(level, photo), [200, 0]),
      project(level, photo, 100, [200, 0, 0])
    )
  })

  test("keeps the field of view for a narrower picture", () => {
    const photo: BedPhoto = { width: 100, height: 100, spindleY: 0 }
    expectPixel(
      mapPoint(bedToPhoto(level, photo), [140, 30]),
      project(level, photo, 50, [140, 30, 0])
    )
  })

  test("sees nothing level with the eye or behind it", () => {
    const matrix = bedToPhoto(level, wide)
    expect(mapPoint(matrix, [-100, 0])).toBeNull()
    expect(mapPoint(matrix, [-150, 20])).toBeNull()
  })
})

describe("photoToBed", () => {
  test("is the inverse of bedToPhoto", () => {
    const photo = { ...vga, spindleY: -20 }
    const product = multiply(
      photoToBed(oblique, photo, 3),
      bedToPhoto(oblique, photo, 3)
    )
    const identity = [1, 0, 0, 0, 1, 0, 0, 0, 1]
    product.forEach((value, index) => {
      expect(value).toBeCloseTo(identity[index], 9)
    })
  })

  test("takes a pixel back to the bed point it shows", () => {
    const photo = { ...vga, spindleY: 15 }
    const pixel = mapPoint(bedToPhoto(oblique, photo), [55, 20])
    expect(pixel).not.toBeNull()
    expectPixel(
      mapPoint(photoToBed(oblique, photo), pixel as PlanePoint),
      [55, 20]
    )
  })

  test("returns null for a pixel above the horizon", () => {
    expect(mapPoint(photoToBed(level, wide), [100, -10])).toBeNull()
  })
})

describe("samplePhotos", () => {
  const photos: BedPhoto[] = [
    { ...wide, spindleY: 0 },
    { ...wide, spindleY: 60 },
  ]
  const matrices = photos.map((photo) => bedToPhoto(level, photo))

  test("takes the photo where the point is nearest the middle", () => {
    const near = samplePhotos(matrices, photos, [100, 40])
    expect(near?.photo).toBe(1)
    expectPixel(
      near?.pixel ?? null,
      project(level, photos[1], 50, [100, 40, 0])
    )
    expect(samplePhotos(matrices, photos, [100, 20])?.photo).toBe(0)
  })

  test("keeps the first of two photos that show a point alike", () => {
    const twice = [photos[0], photos[0]]
    const sample = samplePhotos([matrices[0], matrices[0]], twice, [120, 10])
    expect(sample?.photo).toBe(0)
  })

  test("counts a point on the picture's edge as inside it", () => {
    // With the identity, a bed point is the pixel itself: exactly on each edge, then past one.
    const identity: Matrix3 = [1, 0, 0, 0, 1, 0, 0, 0, 1]
    const edges: PlanePoint[] = [
      [200, 50],
      [0, 50],
      [100, 100],
      [100, 0],
    ]
    for (const pixel of edges) {
      expect(samplePhotos([identity], [wide], pixel)).toEqual({
        photo: 0,
        pixel,
      })
    }
    expect(samplePhotos([identity], [wide], [201, 50])).toBeNull()
    expect(samplePhotos([identity], [wide], [100, -1])).toBeNull()
  })

  test("skips a photo whose picture the point is outside", () => {
    // Far to the side, the point is left of the first photo yet in the second's.
    const point: PlanePoint = [20, 200]
    expect(samplePhotos([matrices[0]], [photos[0]], point)).toBeNull()
    expect(samplePhotos(matrices, photos, point)?.photo).toBe(1)
    // Below the eye but too near: under the bottom edge, though centred across.
    expect(samplePhotos(matrices, photos, [-20, 0])).toBeNull()
    // Inside along the picture's height, outside across it.
    expect(samplePhotos([matrices[0]], [photos[0]], [200, 450])).toBeNull()
  })

  test("is null when no photo shows the point", () => {
    expect(samplePhotos(matrices, photos, [-100, 0])).toBeNull()
    expect(samplePhotos([], [], [100, 0])).toBeNull()
  })
})

describe("bedMosaic", () => {
  // The level camera at a 25th of its size, so a mosaic stays a few cells.
  const near: MachineCamera = {
    ...level,
    position: [0, 0, 4],
    target: [4, 0, 0],
  }
  const photos: BedPhoto[] = [
    { ...wide, spindleY: 0 },
    { ...wide, spindleY: 1.6 },
  ]

  test("fills each cell from the photo that shows its centre best", () => {
    const area = { min: [-3.2, -0.2], max: [4.8, 2] } as const
    const mosaic = bedMosaic(near, photos, area, 2)
    expect(mosaic.columns).toBe(4)
    expect(mosaic.rows).toBe(2)
    const centres = [
      [-2.2, 1],
      [-0.2, 1],
      [1.8, 1],
      [3.8, 1],
      [-2.2, -1],
      [-0.2, -1],
      [1.8, -1],
      [3.8, -1],
    ] as const
    // The two left columns are under or behind the eye; above the middle, the second photo
    // sees a point nearer its centre.
    expect(Array.from(mosaic.photo)).toEqual([-1, -1, 1, 1, -1, -1, 0, 0])
    centres.forEach((centre, index) => {
      const shown = mosaic.photo[index]
      const pixel: PlanePoint = [
        mosaic.pixel[index * 2],
        mosaic.pixel[index * 2 + 1],
      ]
      if (shown < 0) {
        expect(pixel).toEqual([0, 0])
        return
      }
      const want = project(near, photos[shown], 50, [centre[0], centre[1], 0])
      expect(pixel[0]).toBeCloseTo(want[0], 3)
      expect(pixel[1]).toBeCloseTo(want[1], 3)
    })
  })

  test("covers a partial last cell and works on a raised plane", () => {
    const area = { min: [2.75, -0.5], max: [5, 0.5] } as const
    const mosaic = bedMosaic(near, [photos[0]], area, 0.75, 0.25)
    expect(mosaic.columns).toBe(3)
    expect(mosaic.rows).toBe(2)
    expect(Array.from(mosaic.photo)).toEqual([0, 0, 0, 0, 0, 0])
    const last = project(near, photos[0], 50, [4.625, -0.625, 0.25])
    expect(mosaic.pixel[10]).toBeCloseTo(last[0], 3)
    expect(mosaic.pixel[11]).toBeCloseTo(last[1], 3)
  })

  test("is empty without a positive cell size or an area", () => {
    const area = { min: [0, 0], max: [4, 4] } as const
    for (const cell of [0, -1]) {
      const mosaic = bedMosaic(near, photos, area, cell)
      expect([mosaic.columns, mosaic.rows]).toEqual([0, 0])
      expect(mosaic.photo).toHaveLength(0)
      expect(mosaic.pixel).toHaveLength(0)
    }
    const flipped = bedMosaic(near, photos, { min: [4, 4], max: [0, 0] }, 1)
    expect([flipped.columns, flipped.rows]).toEqual([0, 0])
  })
})

describe("the Makera Z1's camera", () => {
  test("sees the bed where its fitted pose puts it", () => {
    const camera = new MakeraZ1().camera
    const matrix = bedToPhoto(camera, vga)
    const focal = focalOf(vga.height, camera.fov)
    const seen: [PlanePoint, PlanePoint][] = [
      [
        [40, 0],
        [314.856, 254.826],
      ],
      [
        [80, -30],
        [417.903, 166.207],
      ],
    ]
    for (const [point, pixel] of seen) {
      const shown = mapPoint(matrix, point)
      expect(shown?.[0]).toBeCloseTo(pixel[0], 2)
      expect(shown?.[1]).toBeCloseTo(pixel[1], 2)
      expectPixel(shown, project(camera, vga, focal, [point[0], point[1], 0]))
    }
  })
})

describe("mosaicPixels", () => {
  // Two photos of 2 × 2 pixels: the first all red but its last pixel, green; the second blue.
  const red = [255, 0, 0, 255]
  const green = [0, 255, 0, 255]
  const blue = [0, 0, 255, 255]
  const pictures = [
    {
      width: 2,
      height: 2,
      data: new Uint8ClampedArray([...red, ...red, ...red, ...green]),
    },
    {
      width: 2,
      height: 2,
      data: new Uint8ClampedArray([...blue, ...blue, ...blue, ...blue]),
    },
  ]

  test("each cell takes the pixel its sample falls in, and a cell without photo stays clear", () => {
    const pixels = mosaicPixels(
      {
        columns: 2,
        rows: 2,
        photo: Int16Array.from([0, 0, 1, -1]),
        pixel: Float32Array.from([0.5, 0.5, 1.9, 1.2, 0, 0, 0, 0]),
      },
      pictures
    )
    expect([...pixels]).toEqual([...red, ...green, ...blue, 0, 0, 0, 0])
  })

  test("a sample on the photo's edge takes the pixel next to it", () => {
    const pixels = mosaicPixels(
      {
        columns: 2,
        rows: 1,
        photo: Int16Array.from([0, 0]),
        pixel: Float32Array.from([2, 2, -0.5, -0.5]),
      },
      pictures
    )
    expect([...pixels]).toEqual([...green, ...red])
  })

  test("a cell naming a photo that was not given stays clear", () => {
    const pixels = mosaicPixels(
      {
        columns: 1,
        rows: 1,
        photo: Int16Array.from([2]),
        pixel: Float32Array.from([0, 0]),
      },
      pictures
    )
    expect([...pixels]).toEqual([0, 0, 0, 0])
  })
})

describe("shootingOrder", () => {
  test("from the end nearer the start, so the bed crosses once", () => {
    expect(shootingOrder(180, [163, 43, 103])).toEqual([163, 103, 43])
    expect(shootingOrder(0, [163, 43, 103])).toEqual([43, 103, 163])
  })

  test("from the lower end when the start is as far from both", () => {
    expect(shootingOrder(103, [163, 43])).toEqual([43, 163])
  })

  test("no stops, no order", () => {
    expect(shootingOrder(10, [])).toEqual([])
  })
})

describe("jogToward", () => {
  const limits = { min: 0.01, max: 10 }

  test("at most the longest jog, toward the stop", () => {
    expect(jogToward(179.7, 163, limits)).toBe(-10)
    expect(jogToward(43, 103, limits)).toBe(10)
  })

  test("what is left when that is shorter, to the micrometre", () => {
    expect(jogToward(169.7, 163, limits)).toBe(-6.7)
    expect(jogToward(153, 163, limits)).toBe(10)
  })

  test("nothing once the stop is within the shortest jog", () => {
    expect(jogToward(163.004, 163, limits)).toBeNull()
    expect(jogToward(163, 163, limits)).toBeNull()
    expect(jogToward(162.99, 163, limits)).toBe(0.01)
  })
})
