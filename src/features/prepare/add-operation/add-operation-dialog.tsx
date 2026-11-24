import { useState } from "react"
import { ArrowLeft, CircuitBoard, Crosshair } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import { FieldSet } from "@/components/ui/field"
import { ImporterView } from "@/features/pcb/importer"
import { AppDialog } from "@/features/shell/app-dialog"
import {
  ProbingSteps,
  useProbingDescription,
  useProbingReason,
} from "./probing-picker"
import { SourceItem } from "./source-item"

/** Built-in machining and probing sources for adding an operation. */
export function AddOperationDialog({
  preset,
  onClose,
}: {
  preset?: "pcb"
  onClose: () => void
}) {
  const { t } = useTranslation("prepare")
  const probingDescription = useProbingDescription()
  const probingReason = useProbingReason()
  const [chosen, choose] = useState<"pcb" | "probing" | null>(preset ?? null)
  if (chosen === "probing")
    return (
      <AppDialog title={t("probing.title")} width="wide" onClose={onClose}>
        <ProbingSteps onAdded={onClose} onBack={() => choose(null)} />
      </AppDialog>
    )
  if (chosen === "pcb")
    return (
      <AppDialog title={t("toolbar.pcb")} width="wide" onClose={onClose}>
        <div className="flex flex-col gap-4">
          <Button
            variant="ghost"
            className="self-start"
            onClick={() => choose(null)}
          >
            <ArrowLeft />
            {t("probing.allSources")}
          </Button>
          <ImporterView onClose={onClose} />
        </div>
      </AppDialog>
    )
  return (
    <AppDialog title={t("addOperation.title")} width="wide" onClose={onClose}>
      <FieldSet>
        <SourceItem
          icon={<CircuitBoard />}
          title={t("toolbar.pcb")}
          description={t("toolbar.pcbDescription")}
          onSelect={() => choose("pcb")}
        />
        <SourceItem
          icon={<Crosshair />}
          title={t("probing.title")}
          description={probingDescription}
          reason={probingReason}
          onSelect={() => choose("probing")}
        />
      </FieldSet>
    </AppDialog>
  )
}
