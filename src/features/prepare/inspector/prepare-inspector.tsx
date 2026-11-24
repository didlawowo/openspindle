import { Layers3 } from "lucide-react"
import { useTranslation } from "react-i18next"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { useSelectedPlate } from "@/app/workspace/workspace-context"
import { usePrepareSelection } from "../plate-tree/use-prepare-selection"
import { OperationInspector } from "./operation-inspector"
import { PlateInspector } from "./plate-inspector"

/** Settings of what is selected in the tree: an operation, or else its plate. */
export function PrepareInspector() {
  const { t } = useTranslation("prepare")
  const plate = useSelectedPlate()
  const selection = usePrepareSelection()
  if (!plate)
    return (
      <Empty className="border-t">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Layers3 />
          </EmptyMedia>
          <EmptyTitle>{t("inspector.noPlate")}</EmptyTitle>
          <EmptyDescription>{t("inspector.noPlateHint")}</EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  const operation = plate.operations.find(
    (item) => item.id === selection.operationId
  )
  return (
    <>
      {operation ? (
        <OperationInspector
          key={operation.id}
          plate={plate}
          operation={operation}
          panel={selection.panel}
          onPanel={selection.showPanel}
        />
      ) : (
        <PlateInspector
          plate={plate}
          panel={selection.panel}
          onPanel={selection.showPanel}
        />
      )}
    </>
  )
}
