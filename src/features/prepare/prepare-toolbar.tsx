import { useTranslation } from "react-i18next"
import {
  Camera,
  CircleStop,
  CircuitBoard,
  Crosshair,
  Settings2,
  ShieldCheck,
} from "lucide-react"
import { Card } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { TooltipProvider } from "@/components/ui/tooltip"
import { ToolbarButton } from "@/components/workspace/toolbar-button"
import {
  selectedPlate,
  useWorkspace,
  useWorkspaceStore,
} from "@/app/workspace/workspace-context"
import { usePhotographBed } from "@/features/bed-photo/use-photograph-bed"
import { checkPlateDesignRules } from "@/features/design-rules/design-rule-check"
import { openDialog } from "@/features/shell/dialogs"
import {
  useProbingDescription,
  useProbingReason,
} from "./add-operation/probing-picker"
import { ArrangeTools } from "./arrange/arrange-tools"

/**
 * Tools over the viewer, as icons that say what they do on hover: moving and locking what is
 * selected in it, the Probing and PCB actions, photographing the bed, then checking the selected plate's design rules
 * and the workspace settings.
 */
export function PrepareToolbar() {
  const { t } = useTranslation("prepare")
  const probingDescription = useProbingDescription()
  const probingReason = useProbingReason()
  const workspace = useWorkspaceStore()
  const hasPlate = useWorkspace((state) => selectedPlate(state) !== null)
  const photo = usePhotographBed()
  return (
    <Card
      size="sm"
      className="absolute top-4 left-1/2 z-10 max-w-[calc(100%-140px)] -translate-x-1/2 p-1"
    >
      <TooltipProvider>
        {/* Scrolls sideways only: a pressed button sinks, which would show a vertical scrollbar. */}
        <div
          className="flex items-center gap-1 overflow-x-auto overflow-y-hidden"
          role="toolbar"
          aria-label={t("toolbar.ariaLabel")}
        >
          <ArrangeTools />
          <Separator orientation="vertical" />
          <ToolbarButton
            label={t("toolbar.probing")}
            description={probingDescription}
            reason={probingReason}
            onClick={() => openDialog({ kind: "probing" })}
          >
            <Crosshair />
          </ToolbarButton>
          <ToolbarButton
            label={t("toolbar.pcb")}
            description={t("toolbar.pcbDescription")}
            onClick={() => openDialog({ kind: "add-operation", preset: "pcb" })}
          >
            <CircuitBoard />
          </ToolbarButton>
          <ToolbarButton
            label={
              photo.shooting
                ? t("toolbar.stopPhotographing")
                : t("toolbar.photographBed")
            }
            description={t("toolbar.photographBedDescription")}
            reason={photo.reason}
            onClick={photo.run}
          >
            {photo.shooting ? <CircleStop /> : <Camera />}
          </ToolbarButton>
          <Separator orientation="vertical" />
          <ToolbarButton
            label={t("toolbar.checkDesignRules")}
            description={t("toolbar.checkDesignRulesDescription")}
            reason={hasPlate ? null : t("toolbar.noPlateToCheck")}
            onClick={() => checkPlateDesignRules(workspace.state)}
          >
            <ShieldCheck />
          </ToolbarButton>
          <ToolbarButton
            label={t("toolbar.workspaceSettings")}
            description={t("toolbar.workspaceSettingsDescription")}
            onClick={() => openDialog({ kind: "workspace-settings" })}
          >
            <Settings2 />
          </ToolbarButton>
        </div>
      </TooltipProvider>
    </Card>
  )
}
