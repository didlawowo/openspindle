import { useTranslation } from "react-i18next"
import { toast } from "sonner"
import { useWorkspaceStore } from "@/app/workspace/workspace-context"
import { plateWithStockBeside } from "@/domain/plate/beside-stock"
import type { Plate } from "@/domain/plate/plate"

/**
 * Adds a second piece of the plate's material on the same bed: a plate of its own, the same
 * setup, its stock beside this one's (`plateWithStockBeside`), selected as the workspace's.
 */
export function useAddMaterial(plate: Plate) {
  const { t } = useTranslation("prepare")
  const workspace = useWorkspaceStore()
  return () => {
    const result = workspace.dispatch({
      type: "plates.add",
      plates: [plateWithStockBeside(plate)],
      select: true,
    })
    if (!result.ok)
      toast.error(t("stock.addOnBedFailed"), {
        description: result.error,
      })
  }
}
