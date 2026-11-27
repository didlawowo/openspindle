import { describe, expect, test } from "vitest"
import { DEFAULT_KIT } from "@/domain/fixtures/catalog"
import type { GCodeProgram } from "@/domain/nc/gcode"
import type { Stock } from "@/domain/stock/stock"
import {
  PLATE_GAP,
  bedArea,
  bedPictureShift,
  layoutPlates,
} from "./bed-viewer-layout"
import type { ViewerPlate } from "./viewer/viewer-input"

const emptyProgram: GCodeProgram = {
  name: "empty",
  source: "",
  lines: [],
  lineCount: 0,
  segments: [],
  bounds: { min: [0, 0, 0], max: [0, 0, 0], size: [0, 0, 0] },
  tools: [],
  unreadable: null,
  offsets: [],
}

const stock: Stock = {
  id: "stock-1",
  name: "Aluminium",
  material: "aluminium",
  width: 100,
  depth: 100,
  height: 10,
  color: "#888888",
}

/** A plate of the default machine with its stock's minimum corner at `at`. */
function plate(
  id: string,
  at: [number, number, number],
  withStock = true
): ViewerPlate {
  return {
    id,
    name: "",
    program: emptyProgram,
    machineProgram: emptyProgram,
    tools: [],
    toolpathBounds: null,
    stock: withStock ? stock : null,
    stockAnchor: at,
    workOrigin: at,
    deviceId: null,
  }
}

const bed = DEFAULT_KIT.bed
const area = bedArea(bed)

describe("layoutPlates", () => {
  test("by default each plate gets its own bed, drawn after the one before", () => {
    const layout = layoutPlates(
      [plate("a", [0, 0, 0]), plate("b", [120, 0, 0])],
      bed
    )
    const [first, second] = layout.placements
    // The first plate starts at its own bed's left edge, so it is drawn where it is.
    expect(first.offsetX).toBe(0)
    // The second starts one gap after the first one's envelope, stock and all.
    expect(second.bounds.min[0]).toBe(first.bounds.max[0] + PLATE_GAP)
  })

  test("by default a plate's name stands over the middle of its bed", () => {
    // The second plate is the one drawn away from its own coordinates: its name moves
    // with the plate.
    const [, placement] = layoutPlates(
      [plate("a", [0, 0, 0]), plate("b", [120, 0, 0])],
      bed
    ).placements
    expect(placement.offsetX).toBeGreaterThan(0)
    expect(placement.label[0]).toBeCloseTo(
      (area.min[0] + area.max[0]) / 2 + placement.offsetX
    )
  })

  test("on one bed, every plate is drawn where it really is", () => {
    const layout = layoutPlates(
      [plate("a", [0, 0, 0]), plate("b", [120, 0, 0])],
      bed,
      true
    )
    const [first, second] = layout.placements
    expect(first.offsetX).toBe(0)
    expect(second.offsetX).toBe(0)
    // Both plates' beds coincide: the second starts where the first does.
    expect(second.bounds.min[0]).toBe(first.bounds.min[0])
  })

  test("on one bed, each name stands over its own stock", () => {
    const layout = layoutPlates(
      [plate("a", [0, 0, 0]), plate("b", [200, 0, 0])],
      bed,
      true
    )
    expect(layout.placements[0].label[0]).toBeCloseTo(50)
    expect(layout.placements[1].label[0]).toBeCloseTo(250)
  })

  test("a plate without stock takes its name from its bed", () => {
    const layout = layoutPlates([plate("a", [0, 0, 0], false)], bed, true)
    expect(layout.placements[0].label[0]).toBeCloseTo(
      (area.min[0] + area.max[0]) / 2
    )
  })

  test("without plates the layout frames the empty bed", () => {
    const layout = layoutPlates([], bed)
    expect(layout.placements).toEqual([])
    expect(layout.bounds.max[0]).toBeGreaterThan(layout.bounds.min[0])
  })
})

describe("bedPictureShift", () => {
  const first = plate("a", [10, 10, 0])
  const second = plate("b", [10, 10, 0])
  const { placements } = layoutPlates([first, second], bed)

  test("with the selected plate's bed", () => {
    expect(placements[1].offsetX).not.toBe(placements[0].offsetX)
    expect(bedPictureShift(placements, "b")).toBe(placements[1].offsetX)
  })

  test("with the first plate's bed when none is selected, or the selected one is gone", () => {
    expect(bedPictureShift(placements, null)).toBe(placements[0].offsetX)
    expect(bedPictureShift(placements, "c")).toBe(placements[0].offsetX)
  })

  test("unshifted without plates", () => {
    expect(bedPictureShift([], null)).toBe(0)
  })
})
