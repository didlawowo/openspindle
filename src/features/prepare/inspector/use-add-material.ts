import { useTranslation } from "react-i18next"
import { toast } from "sonner"
import { useWorkspaceStore } from "@/app/workspace/workspace-context"
import { plateWithStockBeside } from "@/domain/plate/beside-stock"
import type { Plate } from "@/domain/plate/plate"
import type { WorkspaceCommand } from "@/domain/workspace/workspace"

/**
 * Adds another piece of the plate's material on the same bed: a plate of its own, the same
 * setup, its stock beside this one's and clear of the others' (`plateWithStockBeside`),
 * selected as the workspace's. The empty plate a new project starts with stays, as a plate of
 * the user's own, rather than being replaced. Says so when the bed has no room left.
 */
export function useAddMaterial(plate: Plate) {
  const { t } = useTranslation("prepare")
  const workspace = useWorkspaceStore()
  return () => {
    const { plates } = workspace.state
    const added = plateWithStockBeside(plate, plates)
    if (!added) {
      toast.error(t("stock.addOnBedFailed"), {
        description: t("stock.addOnBedNoRoom"),
      })
      return
    }
    const keep = plates
      .filter((item) => item.example)
      .map((item): WorkspaceCommand => ({
        type: "plate.keep",
        plateId: item.id,
      }))
    const result = workspace.dispatch({
      type: "batch",
      commands: [
        ...keep,
        { type: "plates.add", plates: [added], select: true },
      ],
    })
    if (!result.ok)
      toast.error(t("stock.addOnBedFailed"), {
        description: result.error,
      })
  }
}
