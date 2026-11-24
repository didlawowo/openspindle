import { useTranslation } from "react-i18next"
import type { TFunction } from "i18next"
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import type {
  ArrangeDrag,
  ArrangePick,
} from "@/components/workspace/bed-viewer"
import { MOVE_AXES_LABELS } from "@/domain/plate/setup-items"
import type { SetupItem } from "@/domain/plate/setup-items"
import { toMicrometre } from "@/domain/primitives"
import { useWorkspace } from "@/app/workspace/workspace-context"
import type { Operation } from "@/domain/operations/operation"
import {
  PROBE_3D_CORNER_LABELS,
  findsCorner,
} from "@/domain/probing/tasks/origin/params"
import { useArrange, useArrangeDrag } from "./arrange-state"
import type {
  ArrangeState,
  ArrangeTarget,
  OperationPicking,
} from "./arrange-state"

const signed = (value: number) => {
  const rounded = toMicrometre(value)
  return rounded > 0 ? `+${rounded}` : String(rounded)
}

/** How far a drag has gone: the axes it moves along, and what it snapped to. */
function dragText(t: TFunction<"prepare">, { delta, snappedTo }: ArrangeDrag) {
  const moved = (["X", "Y", "Z"] as const)
    .map((axis, index) => `${axis} ${signed(delta[index])}`)
    .join(", ")
  return snappedTo
    ? t("arrange.hint.dragSnapped", { moved, snappedTo })
    : t("arrange.hint.drag", { moved })
}

function hintText(
  t: TFunction<"prepare">,
  item: SetupItem,
  state: ArrangeState,
  pick: ArrangePick,
  drag: ArrangeDrag | null
) {
  if (item.fixed) return item.fixed
  if (!state.moving) return t("arrange.hint.moveTool")
  if (drag) return <span className="font-numeric">{dragText(t, drag)}</span>
  if (pick.from)
    return t("arrange.hint.clickToPoint", { label: pick.from.label })
  if (pick.notice === "pick-own-point")
    return t("arrange.hint.pickOwnPoint", { name: item.name })
  const along = MOVE_AXES_LABELS[state.axes]
  const snapping = state.snap ? t("arrange.hint.snapping") : ""
  return t("arrange.hint.dragAlong", { axes: along, snapping })
}

/** What a point picked for a probing strategy snaps to (`pickTargets`). */
function snapTargets(t: TFunction<"prepare">, strategy: string) {
  switch (strategy) {
    case "outside-corner":
      return t("arrange.picking.targets.outerCorners")
    case "inside-corner":
      return t("arrange.picking.targets.innerCorners")
    case "pocket-center":
      return t("arrange.picking.targets.holeCentres")
    case "boss-center":
      return t("arrange.picking.targets.centres")
    default:
      return t("arrange.picking.targets.cornersAndCentres")
  }
}

/** What a click picks for an operation: where it starts, or which edges it traces. */
function pickingText(
  t: TFunction<"prepare">,
  kind: OperationPicking["kind"],
  operation: Operation | null
) {
  if (kind === "edges") return t("arrange.picking.edges")
  if (kind === "parts") return t("arrange.picking.parts")
  const source = operation?.source
  const snapping = t("arrange.picking.snapping", {
    targets: snapTargets(t, source?.kind === "probing" ? source.strategy : ""),
  })
  if (source?.kind === "probing" && source.task === "origin") {
    const { routine, corner } = source.params
    // A corner snapped to is the one probed; a free pick probes the corner the operation has.
    return findsCorner(routine)
      ? t("arrange.picking.corner", {
          snapping,
          corner: PROBE_3D_CORNER_LABELS[corner].toLowerCase(),
        })
      : t("arrange.picking.centre", { snapping })
  }
  const what =
    source?.kind === "probing" && source.task === "grid"
      ? t("arrange.picking.gridStart")
      : t("arrange.picking.touch")
  return t("arrange.picking.click", { what, snapping })
}

/** What is selected in the viewer, and what clicking and dragging will do with it. */
export function ArrangeHint({
  target,
  pick,
}: {
  target: ArrangeTarget | null
  pick: ArrangePick
}) {
  const { t } = useTranslation("prepare")
  const state = useArrange()
  const drag = useArrangeDrag()
  const { picking } = state
  const operation = useWorkspace(
    (workspace) =>
      (picking &&
        workspace.plates
          .find(({ id }) => id === picking.plateId)
          ?.operations.find(({ id }) => id === picking.operationId)) ??
      null
  )
  if (picking)
    return (
      <Card
        size="sm"
        className="pointer-events-none absolute bottom-4 left-1/2 z-10 w-md max-w-[calc(100%-140px)] -translate-x-1/2"
        aria-live="polite"
      >
        <CardHeader>
          <CardTitle>{operation?.name ?? t("arrange.pick")}</CardTitle>
          <CardDescription>
            {pickingText(t, picking.kind, operation)}
          </CardDescription>
        </CardHeader>
      </Card>
    )
  if (!target) return null
  return (
    <Card
      size="sm"
      className="pointer-events-none absolute bottom-4 left-1/2 z-10 w-md max-w-[calc(100%-140px)] -translate-x-1/2"
      aria-live="polite"
    >
      <CardHeader>
        <CardTitle>{target.item.name}</CardTitle>
        <CardDescription>
          {hintText(t, target.item, state, pick, drag)}
        </CardDescription>
      </CardHeader>
    </Card>
  )
}
