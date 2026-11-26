import { describe, expect, test } from "vitest"
import type { Stock } from "@/domain/stock/stock"
import { createPlate, createPlateSetup } from "./plate"
import { MATERIAL_GAP, besideStock, plateWithStockBeside } from "./beside-stock"

const stock: Stock = {
  id: "stock-1",
  name: "Aluminium",
  material: "aluminium",
  width: 100,
  depth: 100,
  height: 10,
  color: "#888888",
}

const bed = {
  workArea: [400, 400, 100],
  workAreaOrigin: [0, 0] as [number, number],
}
const own = {
  min: [10, 20, 0] as [number, number, number],
  max: [110, 120, 10] as [number, number, number],
}

describe("besideStock", () => {
  test("beside the first piece, with a gap, on the same support", () => {
    expect(besideStock(own, stock, bed)).toEqual([
      own.max[0] + MATERIAL_GAP,
      own.min[1],
      own.min[2],
    ])
  })

  test("below it when the work area has no room to the right", () => {
    const tight = {
      workArea: [115, 400, 100],
      workAreaOrigin: [0, 0] as [number, number],
    }
    expect(besideStock(own, stock, tight)).toEqual([
      own.min[0],
      own.max[1] + MATERIAL_GAP,
      own.min[2],
    ])
  })

  test("to the right anyway when neither direction has room, so they never touch", () => {
    const full = {
      workArea: [110, 120, 100],
      workAreaOrigin: [0, 0] as [number, number],
    }
    expect(besideStock(own, stock, full)).toEqual([
      own.max[0] + MATERIAL_GAP,
      own.min[1],
      own.min[2],
    ])
  })
})

describe("plateWithStockBeside", () => {
  const plate = () =>
    createPlate({
      ...createPlateSetup({ stock, stockSource: "assigned" }),
      stockAnchor: [10, 20, 0],
      workOrigin: [10, 20, 10_000],
    })

  test("the same setup, a new plate, its stock beside this one's", () => {
    const first = plate()
    const second = plateWithStockBeside(first)
    expect(second.id).not.toBe(first.id)
    expect(second.setup.stock).toEqual(stock)
    expect(second.setup.fixtures).toEqual(first.setup.fixtures)
    expect(second.setup.stockAnchor[0]).toBeGreaterThan(
      first.setup.stockAnchor[0] + stock.width
    )
  })

  test("its work origin is on its own stock's top front-left corner", () => {
    const second = plateWithStockBeside(plate())
    const [x, y, z] = second.setup.stockAnchor
    expect(second.setup.workOrigin).toEqual([x, y, z + stock.height])
  })

  test("it is placed in bed coordinates, not kept relative to the first plate's anchor", () => {
    const second = plateWithStockBeside(plate())
    expect(second.setup.stockRelativeTo).toBeNull()
    expect(second.setup.workOriginAnchor).toBeNull()
  })

  test("a plate without stock gives an empty plate on the same setup", () => {
    const empty = createPlate(
      createPlateSetup({ stock: null, stockSource: "unspecified" })
    )
    const second = plateWithStockBeside(empty)
    expect(second.id).not.toBe(empty.id)
    expect(second.setup.stock).toBeNull()
  })
})
