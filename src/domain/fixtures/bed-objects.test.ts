import { describe, expect, test } from "vitest"

import {
  bedObjects,
  fixtureFootprints,
  objectRectangle,
  stockPlace,
} from "./bed-objects"
import type { BedObject, BedView, FootprintSize } from "./bed-objects"
import { bedMosaic, mapPoint, photoToBed } from "./bed-photo"
import type { BedArea, BedPhoto, PlanePoint, PhotoPixels } from "./bed-photo"
import type { MachineCamera } from "./fixture-kit"

type Shape = {
  readonly centre: PlanePoint
  readonly length: number
  readonly width: number
  readonly angle: number
  readonly colour: readonly [number, number, number]
  readonly height: number
}

const BARE = [90, 90, 90] as const
const WALL = [140, 140, 140] as const
const GREY = [200, 200, 200] as const
// As bright as the bare bed: only its colour tells it from the bed.
const COLOURED = [110, 100, 60] as const

const logLum = (r: number, g: number, b: number) =>
  Math.log(((r + g + b) / 765) ** 2.2 + 1e-3)

const LEVEL =
  logLum(BARE[0], BARE[1], BARE[2]) - logLum(WALL[0], WALL[1], WALL[2])

const camera: MachineCamera = {
  position: [-60, 0, 90],
  target: [50, 0, 0],
  fov: 45,
  aspect: 4 / 3,
  stops: [100],
  shade: { shading: [0, 0, 0, 0, 0], wall: 0.04, level: [LEVEL] },
}

const photo: BedPhoto = { width: 640, height: 480, spindleY: 100 }
const area: BedArea = { min: [0, 50], max: [140, 150] }
const cell = 1

const view: BedView = {
  mosaic: bedMosaic(camera, [photo], area, cell),
  area,
  cell,
}

const insideRotatedRectangle = (point: PlanePoint, shape: Shape): boolean => {
  const radians = (shape.angle * Math.PI) / 180
  const cos = Math.cos(radians)
  const sin = Math.sin(radians)
  const dx = point[0] - shape.centre[0]
  const dy = point[1] - shape.centre[1]
  const a = dx * cos + dy * sin
  const b = -dx * sin + dy * cos
  return Math.abs(a) <= shape.length / 2 && Math.abs(b) <= shape.width / 2
}

const render = (shapes: readonly Shape[], gain = 1): PhotoPixels => {
  const data = new Uint8ClampedArray(photo.width * photo.height * 4)
  const matrices = new Map<number, ReturnType<typeof photoToBed>>()

  for (const shape of shapes) {
    if (!matrices.has(shape.height)) {
      matrices.set(shape.height, photoToBed(camera, photo, shape.height))
    }
  }

  for (let j = 0; j < photo.height; j++) {
    for (let i = 0; i < photo.width; i++) {
      const at = (j * photo.width + i) * 4
      data[at + 3] = 255

      let colour: readonly [number, number, number] = BARE

      if (j < 24) {
        colour = WALL
      } else {
        for (const shape of shapes) {
          const matrix = matrices.get(shape.height)
          if (!matrix) continue
          const point = mapPoint(matrix, [i + 0.5, j + 0.5])
          if (point && insideRotatedRectangle(point, shape)) {
            colour = shape.colour
            break
          }
        }
      }

      data[at] = Math.round(colour[0] * gain)
      data[at + 1] = Math.round(colour[1] * gain)
      data[at + 2] = Math.round(colour[2] * gain)
    }
  }

  return { width: photo.width, height: photo.height, data }
}

const rectangle = (
  centre: PlanePoint,
  length: number,
  width: number,
  angle = 0,
  colour: readonly [number, number, number] = GREY,
  height = 0
): Shape => ({ centre, length, width, angle, colour, height })

const noShadeCamera: MachineCamera = {
  position: camera.position,
  target: camera.target,
  fov: camera.fov,
  aspect: camera.aspect,
  stops: camera.stops,
}

const grey60x40 = rectangle([70, 100], 60, 40)
const grey60x40Rotated30 = rectangle([70, 100], 60, 40, 30)
const coloured60x40 = rectangle([70, 100], 60, 40, 0, COLOURED)
const grey40x40Left = rectangle([50, 100], 40, 40)
const coloured40x40Right = rectangle([90, 100], 40, 40, 0, COLOURED)
// Larger than the least stock (1000 mm²): only its width makes it a fixture.
const grey64x18 = rectangle([70, 100], 64, 18)
const grey80x60 = rectangle([70, 100], 80, 60)
const greyTab20x10 = rectangle([120, 100], 20, 10)
const grey60x40AtHeight10 = rectangle([80, 100], 60, 40, 0, GREY, 10)

const emptyFixtures: readonly FootprintSize[] = []
const narrowFixtures: readonly FootprintSize[] = [{ length: 65, width: 20 }]

const firstObject = (objects: readonly BedObject[]): BedObject => {
  const object = objects.at(0)
  if (!object) throw new Error("expected at least one bed object")
  return object
}

describe("bedObjects", () => {
  test("returns no object when the camera has no shade", () => {
    const pictures = [render([grey60x40])]
    const objects = bedObjects(
      noShadeCamera,
      [photo],
      pictures,
      view,
      emptyFixtures
    )
    expect(objects).toEqual([])
  })

  test("returns no object on a bare bed", () => {
    const pictures = [render([])]
    const objects = bedObjects(camera, [photo], pictures, view, emptyFixtures)
    expect(objects).toEqual([])
  })

  test("finds one grey stock rectangle", () => {
    const pictures = [render([grey60x40])]
    const objects = bedObjects(camera, [photo], pictures, view, emptyFixtures)

    expect(objects).toHaveLength(1)
    expect(objects[0]?.kind).toBe("stock")

    const rect = objectRectangle(camera, [photo], view, firstObject(objects), 0)
    expect(Math.abs(rect.centre[0] - 70)).toBeLessThanOrEqual(1.5)
    expect(Math.abs(rect.centre[1] - 100)).toBeLessThanOrEqual(1.5)
    expect(Math.abs(rect.length - 60)).toBeLessThanOrEqual(2.5)
    expect(Math.abs(rect.width - 40)).toBeLessThanOrEqual(2.5)
    expect(Math.abs(rect.angle)).toBeLessThan(2)
  })

  test("finds the same grey rectangle rotated by 30 degrees", () => {
    const pictures = [render([grey60x40Rotated30])]
    const objects = bedObjects(camera, [photo], pictures, view, emptyFixtures)

    expect(objects).toHaveLength(1)
    expect(objects[0]?.kind).toBe("stock")

    const rect = objectRectangle(camera, [photo], view, firstObject(objects), 0)
    expect(rect.angle).toBeGreaterThanOrEqual(27)
    expect(rect.angle).toBeLessThanOrEqual(33)
    expect(Math.abs(rect.length - 60)).toBeLessThanOrEqual(3)
    expect(Math.abs(rect.width - 40)).toBeLessThanOrEqual(3)
  })

  test("finds the same grey rectangle with lower exposure", () => {
    const normal = [render([grey60x40])]
    const dim = [render([grey60x40], 0.7)]

    const normalObjects = bedObjects(
      camera,
      [photo],
      normal,
      view,
      emptyFixtures
    )
    const dimObjects = bedObjects(camera, [photo], dim, view, emptyFixtures)

    expect(dimObjects).toHaveLength(normalObjects.length)
    expect(dimObjects[0]?.kind).toBe("stock")

    const normalRect = objectRectangle(
      camera,
      [photo],
      view,
      firstObject(normalObjects),
      0
    )
    const dimRect = objectRectangle(
      camera,
      [photo],
      view,
      firstObject(dimObjects),
      0
    )

    expect(
      Math.abs(dimRect.centre[0] - normalRect.centre[0])
    ).toBeLessThanOrEqual(1.5)
    expect(
      Math.abs(dimRect.centre[1] - normalRect.centre[1])
    ).toBeLessThanOrEqual(1.5)
    expect(Math.abs(dimRect.length - normalRect.length)).toBeLessThanOrEqual(
      1.5
    )
    expect(Math.abs(dimRect.width - normalRect.width)).toBeLessThanOrEqual(1.5)
  })

  test("finds a coloured stock rectangle", () => {
    const pictures = [render([coloured60x40])]
    const objects = bedObjects(camera, [photo], pictures, view, emptyFixtures)

    expect(objects).toHaveLength(1)
    expect(objects[0]?.kind).toBe("stock")
  })

  test("finds two touching stock rectangles", () => {
    const pictures = [render([grey40x40Left, coloured40x40Right])]
    const objects = bedObjects(camera, [photo], pictures, view, emptyFixtures)

    expect(objects).toHaveLength(2)
    expect(objects.every((object) => object.kind === "stock")).toBe(true)
  })

  test("classifies a narrow piece as a fixture and keeps a wider piece as stock", () => {
    const narrowPictures = [render([grey64x18])]
    const narrowObjects = bedObjects(
      camera,
      [photo],
      narrowPictures,
      view,
      narrowFixtures
    )

    expect(narrowObjects).toHaveLength(1)
    expect(narrowObjects[0]?.kind).toBe("fixture")

    const narrowRect = objectRectangle(
      camera,
      [photo],
      view,
      firstObject(narrowObjects),
      0
    )
    expect(Math.abs(narrowRect.length - 64)).toBeLessThanOrEqual(3)
    expect(Math.abs(narrowRect.width - 18)).toBeLessThanOrEqual(3)

    const widePictures = [render([grey60x40])]
    const wideObjects = bedObjects(
      camera,
      [photo],
      widePictures,
      view,
      narrowFixtures
    )

    expect(wideObjects).toHaveLength(1)
    expect(wideObjects[0]?.kind).toBe("stock")
  })

  test("does not let a tab over the edge lengthen the stock rectangle", () => {
    const pictures = [render([grey80x60, greyTab20x10])]
    const objects = bedObjects(camera, [photo], pictures, view, emptyFixtures)

    expect(objects).toHaveLength(1)
    expect(objects[0]?.kind).toBe("stock")

    const rect = objectRectangle(camera, [photo], view, firstObject(objects), 0)
    expect(Math.abs(rect.length - 80)).toBeLessThanOrEqual(3)
    expect(Math.abs(rect.centre[0] - 70)).toBeLessThanOrEqual(2)
  })

  test("corrects the rectangle for the object thickness", () => {
    const pictures = [render([grey60x40AtHeight10])]
    const objects = bedObjects(camera, [photo], pictures, view, emptyFixtures)

    expect(objects).toHaveLength(1)
    expect(objects[0]?.kind).toBe("stock")

    const object = firstObject(objects)
    const corrected = objectRectangle(camera, [photo], view, object, 10)
    const uncorrected = objectRectangle(camera, [photo], view, object, 0)

    expect(Math.abs(corrected.centre[0] - 80)).toBeLessThanOrEqual(2)
    expect(Math.abs(corrected.centre[1] - 100)).toBeLessThanOrEqual(2)
    expect(Math.abs(corrected.length - 60)).toBeLessThanOrEqual(4)
    expect(Math.abs(corrected.width - 40)).toBeLessThanOrEqual(4)

    expect(uncorrected.centre[0] - corrected.centre[0]).toBeGreaterThanOrEqual(
      5
    )
  })

  test("returns valid unique cell indices", () => {
    const pictures = [render([grey60x40])]
    const objects = bedObjects(camera, [photo], pictures, view, emptyFixtures)

    expect(objects).toHaveLength(1)
    const object = firstObject(objects)
    const limit = view.mosaic.columns * view.mosaic.rows
    const seen = new Set<number>()

    for (const index of object.cells) {
      expect(index).toBeGreaterThanOrEqual(0)
      expect(index).toBeLessThan(limit)
      expect(seen.has(index)).toBe(false)
      seen.add(index)
    }
  })
})

describe("stockPlace", () => {
  const objects = bedObjects(
    camera,
    [photo],
    [render([grey60x40AtHeight10])],
    view,
    emptyFixtures
  )
  const place = (width: number, depth: number) =>
    stockPlace(camera, [photo], view, objects, { width, depth, height: 10 })

  test("sets a block on the piece of its size, by its far edge and its middle", () => {
    const corner = place(56, 40)
    // The piece runs from X 50 to 110 and Y 80 to 120: a block 4 mm shorter keeps X 110.
    expect(Math.abs((corner?.[0] ?? 0) - 54)).toBeLessThanOrEqual(2)
    expect(Math.abs((corner?.[1] ?? 0) - 80)).toBeLessThanOrEqual(2)
  })

  test("sets nothing on a piece turned on the bed", () => {
    const turned = bedObjects(
      camera,
      [photo],
      [render([rectangle([70, 100], 60, 40, 10)])],
      view,
      emptyFixtures
    )
    const block = { width: 60, depth: 40, height: 0 }
    expect(stockPlace(camera, [photo], view, turned, block)).toBeNull()
  })

  test("sets nothing when no piece is near the block's size", () => {
    expect(place(120, 90)).toBeNull()
  })
})

describe("fixtureFootprints", () => {
  const bounds = { min: [0, 0, 0], max: [100, 100, 15] } as const

  test("takes an L-bracket arm by arm, and a clamp with a slot whole", () => {
    const arms = [
      { min: [0, 0, 0], max: [100, 15, 15] },
      { min: [0, 15, 0], max: [15, 100, 15] },
    ] as const
    expect(fixtureFootprints(bounds, arms)).toEqual([
      { length: 100, width: 15 },
      { length: 85, width: 15 },
    ])
    const slotted = [{ min: [0, 0, 0], max: [100, 60, 15] }] as const
    expect(fixtureFootprints(bounds, slotted)).toEqual([
      { length: 100, width: 100 },
    ])
    expect(fixtureFootprints(bounds, null)).toEqual([
      { length: 100, width: 100 },
    ])
  })
})
