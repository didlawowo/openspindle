import { useTranslation } from "react-i18next"
import { toast } from "sonner"
import {
  useSelectedPlate,
  useWorkspaceStore,
} from "@/app/workspace/workspace-context"
import { stockPlace } from "@/domain/fixtures/bed-objects"
import { toMicrometre } from "@/domain/primitives"
import { useBedPicture } from "./bed-picture"

/**
 * Sets the selected plate's stock where the bed's photo shows a piece of its size
 * (`stockPlace`): the stock moves there with the design on it, as dragging it does. Nothing
 * moves when the photo shows no piece of that size, or was taken of another device's bed.
 */
export function usePlaceStock() {
  const { t } = useTranslation("prepare")
  const plate = useSelectedPlate()
  const workspace = useWorkspaceStore()
  const { found } = useBedPicture()
  const stock = plate?.setup.stock ?? null

  const reason = (() => {
    if (!found) return t("bedPhoto.placeNoPhoto")
    if (!stock) return t("bedPhoto.placeNoStock")
    if (plate?.setup.deviceId !== found.deviceId)
      return t("bedPhoto.otherDevice")
    return null
  })()

  const run = () => {
    if (!plate || !stock || !found) return
    const [x, y, z] = plate.setup.stockAnchor
    // The photo shows the bed's plane, Z 0: the stock's top is its height above what it lies on.
    const place = stockPlace(
      found.camera,
      found.photos,
      found.view,
      found.objects,
      { width: stock.width, depth: stock.depth, height: z + stock.height }
    )
    if (!place) {
      toast.error(t("bedPhoto.placeNotFound"))
      return
    }
    const result = workspace.dispatch({
      type: "plate.moveItem",
      plateId: plate.id,
      item: { kind: "stock" },
      delta: [toMicrometre(place[0] - x), toMicrometre(place[1] - y), 0],
    })
    if (result.ok) toast.success(t("bedPhoto.placed"))
    else toast.error(t("bedPhoto.placeFailed"), { description: result.error })
  }
  return { reason, run }
}
