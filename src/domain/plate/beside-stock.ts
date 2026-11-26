import { kitForSetup } from "@/domain/fixtures/catalog"
import { stockBox } from "./bed-conflicts"
import type { StockBox } from "./bed-conflicts"
import type { WorkAreaXY } from "./placement"
import { createPlate } from "./plate"
import type { Plate } from "./plate"
import { toMicrometre } from "@/domain/primitives"
import type { Stock } from "@/domain/stock/stock"

/** The gap left between two pieces of material placed side by side, in millimetres. */
export const MATERIAL_GAP = 10

/**
 * Where a second piece of `stock` sits on the bed, clear of `own`: to its right when the
 * machine's work area has room, else below it, else right where that room ends (so the two
 * never touch, and the user moves it from there).
 */
export function besideStock(
  own: StockBox,
  stock: Pick<Stock, "width" | "depth">,
  { workArea: [width, depth], workAreaOrigin: [x, y] }: WorkAreaXY
): [number, number, number] {
  const right = own.max[0] + MATERIAL_GAP
  if (right + stock.width <= x + width) return [right, own.min[1], own.min[2]]
  const below = own.max[1] + MATERIAL_GAP
  if (below + stock.depth <= y + depth) return [own.min[0], below, own.min[2]]
  return [right, own.min[1], own.min[2]]
}

/**
 * The plate a second piece of the same material makes: the same setup, its stock set beside
 * this plate's on the bed, with its work origin on its own top front-left corner. A plate
 * without stock gives an empty plate on the same setup.
 */
export function plateWithStockBeside(plate: Plate): Plate {
  const { stock } = plate.setup
  const own = stockBox(plate)
  if (!stock || !own) return createPlate({ ...plate.setup })
  const anchor = besideStock(own, stock, kitForSetup(plate.setup))
  return createPlate({
    ...plate.setup,
    stock,
    stockAnchor: anchor,
    workOrigin: [anchor[0], anchor[1], toMicrometre(anchor[2] + stock.height)],
    stockRelativeTo: null,
    workOriginAnchor: null,
  })
}
