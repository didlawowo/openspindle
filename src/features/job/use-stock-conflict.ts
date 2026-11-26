import { useMemo } from "react"
import { useWorkspace } from "@/app/workspace/workspace-context"
import { touchingStocks } from "@/domain/plate/bed-conflicts"
import type { Plate } from "@/domain/plate/plate"

/**
 * The plate whose stock touches this one's, as the Plates list names it; null when the plate
 * is clear of every other. Run refuses while two plates' stock meet on the bed.
 */
export function useStockConflict(plate: Plate | null): string | null {
  const plates = useWorkspace((state) => state.plates)
  return useMemo(() => {
    if (!plate) return null
    return touchingStocks(plate, plates).at(0) ?? null
  }, [plate, plates])
}
