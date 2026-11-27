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
  workArea: [220, 400, 100],
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

  test("nowhere when neither direction has room in the work area", () => {
    const full = {
      workArea: [110, 120, 100],
      workAreaOrigin: [0, 0] as [number, number],
    }
    expect(besideStock(own, stock, full)).toBeNull()
  })

  test("to the left when only that side has room", () => {
    const wide = {
      workArea: [210, 120, 100],
      workAreaOrigin: [-100, 0] as [number, number],
    }
    expect(besideStock(own, stock, wide)).toEqual([-100, 20, 0])
  })

  test("in front when only that side has room", () => {
    const deep = {
      workArea: [115, 215, 100],
      workAreaOrigin: [0, -90] as [number, number],
    }
    expect(besideStock(own, stock, deep)).toEqual([10, -90, 0])
  })

  test("past a piece already on the bed, never on it", () => {
    const right = {
      min: [120, 20, 0] as [number, number, number],
      max: [220, 120, 10] as [number, number, number],
    }
    expect(besideStock(own, stock, bed, [right])).toEqual([10, 130, 0])
  })
})

/** The plate added beside, which these beds have room for. */
function beside(...args: Parameters<typeof plateWithStockBeside>) {
  const added = plateWithStockBeside(...args)
  if (!added) throw new Error("no room on the bed")
  return added
}

describe("plateWithStockBeside", () => {
  const small: Stock = { ...stock, width: 40, depth: 40 }
  const plate = () =>
    createPlate({
      ...createPlateSetup({ stock: small, stockSource: "assigned" }),
      stockAnchor: [10, 20, 0],
      workOrigin: [10, 20, 10_000],
    })

  test("the same setup, a new plate, its stock beside this one's", () => {
    const first = plate()
    const second = beside(first)
    expect(second.id).not.toBe(first.id)
    expect(second.setup.stock).toEqual(small)
    expect(second.setup.fixtures).toEqual(first.setup.fixtures)
    expect(second.setup.stockAnchor[0]).toBeGreaterThan(
      first.setup.stockAnchor[0] + small.width
    )
  })

  test("its work origin is on its own stock's top front-left corner", () => {
    const second = beside(plate())
    const [x, y, z] = second.setup.stockAnchor
    expect(second.setup.workOrigin).toEqual([x, y, z + small.height])
  })

  test("it is placed in bed coordinates, not kept relative to the first plate's anchor", () => {
    const second = beside(plate())
    expect(second.setup.stockRelativeTo).toBeNull()
    expect(second.setup.workOriginAnchor).toBeNull()
  })

  test("a plate without stock gives an empty plate on the same setup", () => {
    const empty = createPlate(
      createPlateSetup({ stock: null, stockSource: "unspecified" })
    )
    const second = beside(empty)
    expect(second.id).not.toBe(empty.id)
    expect(second.setup.stock).toBeNull()
  })

  test("a plate without stock on the bed takes no room", () => {
    const first = plate()
    const empty = createPlate(
      createPlateSetup({ stock: null, stockSource: "unspecified" })
    )
    expect(beside(first, [first, empty]).setup.stockAnchor).toEqual(
      beside(first, [first]).setup.stockAnchor
    )
  })

  test("a second one from the same plate sits clear of the first", () => {
    const first = plate()
    const second = beside(first, [first])
    const third = beside(first, [first, second])
    expect(third.setup.stockAnchor).not.toEqual(second.setup.stockAnchor)
  })
})
