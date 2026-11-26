import type { Point3 } from "@/domain/primitives"
import { plateLabel } from "./plate"
import type { Plate, PlateSetup } from "./plate"

/** A plate as the bed reads it: what it is called, and where its stock sits on the bed. */
export type BedPlate = Pick<Plate, "id" | "name"> & {
  readonly setup: Pick<PlateSetup, "stock" | "stockAnchor">
}

/** The box a plate's stock fills, in bed coordinates. */
export type StockBox = { readonly min: Point3; readonly max: Point3 }

/** The box a plate's stock occupies; null for a plate without stock. */
export function stockBox(plate: BedPlate): StockBox | null {
  const { stock, stockAnchor } = plate.setup
  if (!stock) return null
  return {
    min: stockAnchor,
    max: [
      stockAnchor[0] + stock.width,
      stockAnchor[1] + stock.depth,
      stockAnchor[2] + stock.height,
    ],
  }
}

/**
 * Whether two stocks are on each other: they share a point, so a gap of nothing already counts
 * as touching, on every axis.
 */
export function stocksTouch(a: StockBox, b: StockBox): boolean {
  return ([0, 1, 2] as const).every(
    (axis) => a.min[axis] <= b.max[axis] && b.min[axis] <= a.max[axis]
  )
}

/**
 * The plates whose stock touches this plate's, named as the Plates list names them. Two plates
 * on one bed may hold different work, but their stock cannot overlap: the machine would cut
 * one into the other.
 */
export function touchingStocks(
  plate: BedPlate,
  plates: readonly BedPlate[]
): readonly string[] {
  const own = stockBox(plate)
  if (!own) return []
  const touching: string[] = []
  plates.forEach((other, index) => {
    if (other.id === plate.id) return
    const box = stockBox(other)
    if (box && stocksTouch(own, box)) touching.push(plateLabel(other, index))
  })
  return touching
}
