import { describe, expect, test } from "vitest"
import type { Stock } from "@/domain/stock/stock"
import { stockBox, stocksTouch, touchingStocks } from "./bed-conflicts"
import type { BedPlate } from "./bed-conflicts"

/** A plate whose stock sits with its minimum corner at `at`, 100 × 100 × 10. */
function plate(
  id: string,
  name: string,
  at: [number, number, number],
  stock: Stock | null = {
    id: "stock",
    name: "Aluminium",
    material: "aluminium",
    width: 100,
    depth: 100,
    height: 10,
    color: "#888888",
  }
): BedPlate {
  return { id, name, setup: { stock, stockAnchor: at } }
}

describe("stockBox", () => {
  test("a stock fills the box from its anchor by its own size", () => {
    expect(stockBox(plate("a", "A", [10, 20, 30]))).toEqual({
      min: [10, 20, 30],
      max: [110, 120, 40],
    })
  })

  test("a plate without stock has no box", () => {
    expect(stockBox(plate("a", "A", [0, 0, 0], null))).toBeNull()
  })
})

describe("stocksTouch", () => {
  const box = (
    min: [number, number, number],
    max: [number, number, number]
  ) => ({
    min,
    max,
  })
  const one = box([0, 0, 0], [100, 100, 10])

  test("a gap on one axis keeps them apart", () => {
    expect(stocksTouch(one, box([101, 0, 0], [200, 100, 10]))).toBe(false)
  })

  test("sharing a face is touching: a gap of nothing counts", () => {
    expect(stocksTouch(one, box([100, 0, 0], [200, 100, 10]))).toBe(true)
  })

  test("overlapping boxes touch", () => {
    expect(stocksTouch(one, box([50, 50, 5], [150, 150, 15]))).toBe(true)
  })

  test("one above the other without meeting does not touch", () => {
    expect(stocksTouch(one, box([0, 0, 10.5], [100, 100, 20]))).toBe(false)
  })
})

describe("touchingStocks", () => {
  test("plates clear of each other name nothing", () => {
    const plates = [plate("a", "A", [0, 0, 0]), plate("b", "B", [200, 0, 0])]
    expect(touchingStocks(plates[0], plates)).toEqual([])
  })

  test("the plate whose stock touches is named as the Plates list names it", () => {
    const plates = [plate("a", "", [0, 0, 0]), plate("b", "", [100, 0, 0])]
    expect(touchingStocks(plates[0], plates)).toEqual(["Plate 2"])
    expect(touchingStocks(plates[1], plates)).toEqual(["Plate 1"])
  })

  test("a named plate keeps its name", () => {
    const plates = [
      plate("a", "Left", [0, 0, 0]),
      plate("b", "Right", [90, 0, 0]),
    ]
    expect(touchingStocks(plates[0], plates)).toEqual(["Right"])
  })

  test("every plate touching is named, and a plate is never its own neighbour", () => {
    const plates = [
      plate("a", "Middle", [100, 0, 0]),
      plate("b", "Before", [0, 0, 0]),
      plate("c", "After", [200, 0, 0]),
    ]
    expect(touchingStocks(plates[0], plates)).toEqual(["Before", "After"])
  })

  test("a plate without stock touches nothing", () => {
    const plates = [
      plate("a", "A", [0, 0, 0], null),
      plate("b", "B", [0, 0, 0]),
    ]
    expect(touchingStocks(plates[0], plates)).toEqual([])
  })
})
