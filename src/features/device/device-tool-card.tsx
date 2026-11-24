import { useEffect, useId, useState } from "react"
import { useTranslation } from "react-i18next"
import { ArrowLeftRight, Check, Play, Wrench } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Field, FieldLabel } from "@/components/ui/field"
import type {
  AvailabilityKey,
  ConnectedDevice,
  MachineCommand,
  MachineFeatures,
  Telemetry,
} from "@/machine/contract"
import {
  useSelectedPlate,
  useWorkspace,
} from "@/app/workspace/workspace-context"
import type { Plate } from "@/domain/plate/plate"
import type { Tool } from "@/domain/tools/tool"
import { OptionSelect } from "@/components/option-select"
import { Hint } from "@/components/workspace/hint"
import { ReasonButton } from "@/components/workspace/reason-button"
import { toolText } from "./device-format"
import { ControlCard } from "./device-control-card"

const TOOL_HINT_KEY = "tool.hint"

/**
 * The tools to set or change to: none, the selected plate's table by number and name, and the
 * one the machine holds where the table does not have it.
 */
function toolOptions(
  plate: Plate | null,
  library: readonly Tool[],
  held: number | null,
  noneLabel: string
) {
  const entries = (plate?.tools ?? [])
    .flatMap(({ number, toolId }) =>
      number === null ? [] : [{ number, toolId }]
    )
    .sort((a, b) => a.number - b.number)
  const options = [
    { value: -1, label: noneLabel },
    ...entries.map(({ number, toolId }) => {
      const tool = library.find(({ id }) => id === toolId)
      return {
        value: number,
        label: tool ? `T${number} · ${tool.name}` : `T${number}`,
      }
    }),
  ]
  if (held !== null && !options.some(({ value }) => value === held))
    options.push({ value: held, label: toolText(held) })
  return options
}

/**
 * The tool the machine holds, and a tool to set it to without measuring or change to with the
 * machine's tool change, which waits for Tool installed.
 */
export function DeviceToolCard({
  device,
  features,
  telemetry,
  pending,
  reason,
  execute,
  change,
}: {
  device: ConnectedDevice | null
  features: MachineFeatures | null
  telemetry: Telemetry | null
  pending: boolean
  reason: (key: AvailabilityKey, action?: MachineCommand) => string | null
  execute: (action: MachineCommand) => void
  /** Changes to a tool with the machine's tool change, also to the one it holds. */
  change: (tool: number) => void
}) {
  const { t } = useTranslation("device")
  const fieldId = useId()
  const [choice, setChoice] = useState<number | null>(null)
  useEffect(() => {
    setChoice(null)
  }, [device?.host, device?.port])
  const plate = useSelectedPlate()
  const library = useWorkspace((state) => state.tools)
  const held = telemetry?.tool ?? null
  const options = toolOptions(plate, library, held, t("common.none"))
  const label = (tool: number) =>
    options.find(({ value }) => value === tool)?.label ?? toolText(tool)
  const tool = choice ?? held ?? -1
  const setTool: MachineCommand = { type: "setTool", tool }
  const changeTool: MachineCommand = {
    type: "changeTool",
    tool: Math.max(tool, 0),
  }
  return (
    <ControlCard
      title={t("status.tool")}
      icon={<Wrench size={16} />}
      action={
        <Badge variant="secondary" className="max-w-56 truncate">
          {held === null ? "—" : label(held)}
        </Badge>
      }
    >
      <form
        className="flex items-end gap-2"
        onSubmit={(event) => {
          event.preventDefault()
          execute(setTool)
        }}
      >
        <Field className="min-w-0 flex-1">
          <FieldLabel htmlFor={`${fieldId}-tool`}>
            <Hint text={t(TOOL_HINT_KEY)}>{t("status.tool")}</Hint>
          </FieldLabel>
          <OptionSelect
            id={`${fieldId}-tool`}
            aria-label={t("tool.choiceAria")}
            className="w-full"
            options={options}
            value={tool}
            disabled={!device}
            onValueChange={setChoice}
          />
        </Field>
        <ReasonButton
          label={t("tool.setAria")}
          type="submit"
          variant="outline"
          reason={
            reason("setTool", setTool) ??
            (tool === held ? t("tool.holdsTool", { tool: label(tool) }) : null)
          }
          disabled={pending}
        >
          <Check />
          {t("tool.set")}
        </ReasonButton>
        <ReasonButton
          label={t("tool.changeAria")}
          type="button"
          variant="outline"
          reason={
            reason("changeTool", changeTool) ??
            (tool < 0 ? t("tool.chooseTool") : null)
          }
          disabled={pending}
          onClick={() => change(tool)}
        >
          <ArrowLeftRight />
          {t("tool.change")}
        </ReasonButton>
      </form>
      {telemetry?.state === "Tool" && !features?.atc && (
        <ReasonButton
          label={t("status.toolInstalled")}
          variant="default"
          size="sm"
          className="self-start"
          reason={reason("confirmToolChange")}
          disabled={pending}
          onClick={() => execute({ type: "confirmToolChange" })}
        >
          <Play />
          {telemetry.requestedTool === null || telemetry.requestedTool < 0
            ? t("status.toolInstalled")
            : t("tool.installed", { tool: toolText(telemetry.requestedTool) })}
        </ReasonButton>
      )}
    </ControlCard>
  )
}
