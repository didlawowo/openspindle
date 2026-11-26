import { kitForSetup } from "@/domain/fixtures/catalog"
import { stockBox, stocksTouch } from "./bed-conflicts"
import type { BedPlate, StockBox } from "./bed-conflicts"
import type { WorkAreaXY } from "./placement"
import { createPlate } from "./plate"
import type { Plate } from "./plate"
import { toMicrometre } from "@/domain/primitives"
import type { Point3 } from "@/domain/primitives"
import type { Stock } from "@/domain/stock/stock"

/** The gap left between two pieces of material placed side by side, in millimetres. */
export const MATERIAL_GAP = 10

/**
 * Where another piece of `stock` sits on the bed, beside `own`: to its right, else behind it,
 * to its left or in front of it, else beside another piece already on the bed (`others`) in the
 * same order. The place is inside the machine's work area and touches no piece; null when
 * none of these places is free.
 */
export function besideStock(
  own: StockBox,
  stock: Pick<Stock, "width" | "depth" | "height">,
  { workArea: [width, depth], workAreaOrigin: [x, y] }: WorkAreaXY,
  others: readonly StockBox[] = []
): Point3 | null {
  const boxes = [own, ...others]
  const z = own.min[2]
  const places = boxes.flatMap((box): Point3[] => [
    [box.max[0] + MATERIAL_GAP, box.min[1], z],
    [box.min[0], box.max[1] + MATERIAL_GAP, z],
    [toMicrometre(box.min[0] - MATERIAL_GAP - stock.width), box.min[1], z],
    [box.min[0], toMicrometre(box.min[1] - MATERIAL_GAP - stock.depth), z],
  ])
  const free = ([px, py]: Point3) => {
    const inside =
      px >= x &&
      py >= y &&
      px + stock.width <= x + width &&
      py + stock.depth <= y + depth
    if (!inside) return false
    const placed: StockBox = {
      min: [px, py, z],
      max: [px + stock.width, py + stock.depth, z + stock.height],
    }
    return !boxes.some((box) => stocksTouch(placed, box))
  }
  return places.find(free) ?? null
}

/**
 * The plate another piece of the same material makes: the same setup, its stock set beside
 * this plate's on the bed, clear of the stock of the `plates` already there, with its work
 * origin on its own top front-left corner. A plate without stock gives an empty plate on the
 * same setup; null when no place beside a piece on the bed is free.
 */
export function plateWithStockBeside(
  plate: Plate,
  plates: readonly BedPlate[] = []
): Plate | null {
  const { stock } = plate.setup
  const own = stockBox(plate)
  if (!stock || !own) return createPlate({ ...plate.setup })
  const others = plates
    .filter((other) => other.id !== plate.id)
    .map(stockBox)
    .filter((box) => box !== null)
  const anchor = besideStock(own, stock, kitForSetup(plate.setup), others)
  if (!anchor) return null
  return createPlate({
    ...plate.setup,
    stock,
    stockAnchor: anchor,
    workOrigin: [anchor[0], anchor[1], toMicrometre(anchor[2] + stock.height)],
    stockRelativeTo: null,
    workOriginAnchor: null,
  })
}
