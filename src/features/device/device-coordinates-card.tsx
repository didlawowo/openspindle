import { useEffect, useId, useState } from "react"
import { useTranslation } from "react-i18next"
import { Crosshair, LayoutDashboard, Move3D } from "lucide-react"
import { cn } from "cn"
import { Button } from "@/components/ui/button"
import {
  FieldLabel,
  FieldLegend,
  FieldSet,
  FieldDescription,
} from "@/components/ui/field"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import type {
  AvailabilityKey,
  Axis,
  ConnectedDevice,
  MachineCommand,
  Telemetry,
} from "@/machine/contract"
import { AXIS_COLORS } from "@/components/workspace/axis-label"
import { Hint } from "@/components/workspace/hint"
import { MeasurementInput } from "@/components/workspace/measurement-input"
import { ReasonButton } from "@/components/workspace/reason-button"
import { useWorkspace } from "@/app/workspace/workspace-context"
import { openDialog } from "@/features/shell/dialogs"
import { axisKey, numberText } from "./device-format"
import { ControlCard } from "./device-control-card"

const AXES = ["X", "Y", "Z"] as const

const ORIGIN_HINT_KEY = "coordinates.originHint"

/** What setting an axis's work position does besides; Z takes the tool in the spindle as the reference. */
const WORK_HINT_KEYS: Readonly<Record<Axis, string>> = {
  X: "coordinates.workHintX",
  Y: "coordinates.workHintY",
  Z: "coordinates.workHintZ",
}

/**
 * An axis's work position, large in its colour, with the machine position and where work zero
 * is below; a click opens zeroing it, or setting it to a coordinate.
 */
function AxisTile({
  axis,
  telemetry,
  pending,
  reason,
  execute,
}: {
  axis: Axis
  telemetry: Telemetry | null
  pending: boolean
  reason: (key: AvailabilityKey, action?: MachineCommand) => string | null
  execute: (action: MachineCommand) => void
}) {
  const { t } = useTranslation("device")
  const id = useId()
  const [open, setOpen] = useState(false)
  const [entry, setEntry] = useState("")
  const key = axisKey(axis)
  const work = telemetry?.work?.[key]
  const zero: MachineCommand = { type: "zero", axes: [axis] }
  const set: MachineCommand = {
    type: "setWork",
    axis,
    position: Number(entry),
  }
  const done = (action: MachineCommand) => {
    execute(action)
    setOpen(false)
  }
  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (next) setEntry("")
      }}
    >
      <PopoverTrigger
        render={
          <button
            type="button"
            className="flex min-w-0 flex-col gap-1 rounded-lg bg-muted px-3 py-2 text-left outline-none hover:bg-muted/70 focus-visible:ring-[3px] focus-visible:ring-ring/50"
            aria-label={t("coordinates.work", { axis })}
          />
        }
      >
        <span className="flex items-baseline justify-between gap-2">
          <span className={cn("text-xl font-semibold", AXIS_COLORS[axis])}>
            {axis}
          </span>
          <span className="truncate font-numeric text-xl">
            {numberText(work, 3)}
          </span>
        </span>
        <span className="flex justify-between gap-2 text-xs text-muted-foreground">
          <span>{t("coordinates.machine")}</span>
          <span className="font-numeric">
            {numberText(telemetry?.machine?.[key], 3)}
          </span>
        </span>
        <span
          className="flex justify-between gap-2 text-xs text-muted-foreground"
          title={t(ORIGIN_HINT_KEY, { defaultValue: ORIGIN_HINT_KEY })}
        >
          <span>{t("coordinates.origin")}</span>
          <span className="font-numeric">
            {numberText(telemetry?.workOrigin?.[key], 3)}
          </span>
        </span>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64">
        <form
          className="flex flex-col gap-2"
          onSubmit={(event) => {
            event.preventDefault()
            if (entry.trim()) done(set)
          }}
        >
          <FieldLabel htmlFor={`${id}-work`}>
            <Hint
              text={t(WORK_HINT_KEYS[axis], {
                defaultValue: WORK_HINT_KEYS[axis],
              })}
            >
              {t("coordinates.work", { axis })}
            </Hint>
          </FieldLabel>
          <div className="flex gap-2">
            <MeasurementInput
              id={`${id}-work`}
              axis={axis}
              unit="mm"
              type="number"
              step="any"
              autoFocus
              value={entry}
              placeholder={numberText(work, 3)}
              onChange={(event) => setEntry(event.target.value)}
            />
            <ReasonButton
              label={t("coordinates.setWork", { axis })}
              type="submit"
              reason={
                entry.trim()
                  ? reason("setWork", set)
                  : t("coordinates.enterPosition")
              }
              disabled={pending}
            >
              {t("coordinates.set")}
            </ReasonButton>
          </div>
          <ReasonButton
            label={t("coordinates.zero", { axis })}
            type="button"
            variant="outline"
            reason={reason("zero", zero)}
            disabled={pending}
            onClick={() => done(zero)}
          >
            <Crosshair />
            {t("coordinates.zero", { axis })}
          </ReasonButton>
        </form>
      </PopoverContent>
    </Popover>
  )
}

/** Work and machine coordinates and the stored work zero for each axis, and zeroing them. */
export function DeviceCoordinatesCard({
  device,
  telemetry,
  pending,
  reason,
  allowed,
  execute,
}: {
  device: ConnectedDevice | null
  telemetry: Telemetry | null
  pending: boolean
  reason: (key: AvailabilityKey, action?: MachineCommand) => string | null
  allowed: (action: MachineCommand) => boolean
  execute: (action: MachineCommand) => void
}) {
  const { t } = useTranslation("device")
  const [confirmXyz, setConfirmXyz] = useState(false)
  useEffect(() => {
    setConfirmXyz(false)
  }, [device?.host, device?.port])
  const xyz: MachineCommand = { type: "zero", axes: ["X", "Y", "Z"] }
  const hasPlates = useWorkspace((state) => state.plates.length > 0)
  return (
    <ControlCard
      title={t("coordinates.title")}
      icon={<Move3D size={16} />}
      action={
        <div className="flex gap-1">
          <ReasonButton
            label={t("coordinates.setOriginFromPlate")}
            variant="ghost"
            size="sm"
            reason={
              hasPlates ? reason("setOrigin") : t("coordinates.addPlateFirst")
            }
            disabled={pending}
            onClick={() => openDialog({ kind: "set-origin" })}
          >
            <LayoutDashboard />
            {t("coordinates.fromPlate")}
          </ReasonButton>
          <ReasonButton
            label={t("coordinates.zeroXyz")}
            variant="ghost"
            size="sm"
            reason={reason("zero")}
            disabled={pending}
            onClick={() => setConfirmXyz(true)}
          >
            <Crosshair />
            {t("coordinates.zeroXyz")}
          </ReasonButton>
        </div>
      }
    >
      <div className="grid grid-cols-3 gap-2">
        {AXES.map((axis) => (
          <AxisTile
            key={axis}
            axis={axis}
            telemetry={telemetry}
            pending={pending}
            reason={reason}
            execute={execute}
          />
        ))}
      </div>
      {confirmXyz && (
        <FieldSet role="alert">
          <FieldLegend variant="label">
            {t("coordinates.zeroXyzLegend")}
          </FieldLegend>
          <FieldDescription>{t("coordinates.zeroXyzHint")}</FieldDescription>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              disabled={!allowed(xyz)}
              onClick={() => {
                execute(xyz)
                setConfirmXyz(false)
              }}
            >
              {t("coordinates.zeroXyzConfirm")}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setConfirmXyz(false)}
            >
              {t("common.cancel")}
            </Button>
          </div>
        </FieldSet>
      )}
    </ControlCard>
  )
}
