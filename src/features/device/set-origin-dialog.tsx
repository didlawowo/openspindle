import { useId, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import type { TFunction } from "i18next"
import { toast } from "sonner"
import { Undo2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { OptionSelect } from "@/components/option-select"
import { BedViewer } from "@/components/workspace/bed-viewer"
import type { MachineOrigin } from "@/components/workspace/bed-viewer"
import { Hint } from "@/components/workspace/hint"
import { MeasurementInput } from "@/components/workspace/measurement-input"
import { ReasonButton } from "@/components/workspace/reason-button"
import { bedPositionOf } from "@/app/workspace/machine-program"
import { useWorkspace } from "@/app/workspace/workspace-context"
import { plateLabel } from "@/domain/plate/plate"
import type { Plate } from "@/domain/plate/plate"
import { workOriginOnMachine } from "@/domain/plate/work-origin"
import { formatMillimetres } from "@/domain/geometry/millimetres"
import { AppDialog } from "@/features/shell/app-dialog"
import { useWorkspaceViewerPlates } from "@/features/viewer/workspace-viewer-plates"
import { MachineCommandSchema, machineId } from "@/machine/contract"
import type { MachineCommand } from "@/machine/contract"
import { useMachineCommand, useMachineSnapshot } from "@/platform/machine"

const NO_SELECTION = () => {}

type DeviceT = TFunction<"device">

/** Machine X and Y the plate's work origin is at, as Run sets them; why not when it cannot. */
function plateOrigin(
  plate: Plate | null,
  connectedId: string | null,
  t: DeviceT
):
  | { readonly position: readonly [number, number]; readonly factory: boolean }
  | { readonly reason: string } {
  if (!plate) return { reason: t("origin.choosePlate") }
  if (connectedId !== null && plate.setup.deviceId !== connectedId)
    return { reason: t("origin.otherDevice") }
  if (plate.setup.machineOrigin) return { reason: t("origin.machineKeeps") }
  const origin = workOriginOnMachine(plate.setup)
  if (!origin) return { reason: t("origin.readAnchors") }
  return { position: origin.position, factory: origin.factory }
}

const entryText = (value: number) => formatMillimetres(value)

/**
 * Sets where the machine keeps work X0 Y0 from a plate: where its work origin is on the machine,
 * as Run sets it, or X and Y entered over it, with the plate seen from above and the origin on
 * it. Work Z stays.
 */
export function SetOriginDialog({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation("device")
  const id = useId()
  const plates = useWorkspace((state) => state.plates)
  const selectedPlateId = useWorkspace((state) => state.selectedPlateId)
  const machine = useMachineSnapshot()
  const command = useMachineCommand()
  const device = machine.connection.device
  const connectedId = device ? machineId(device) : null
  const [plateId, setPlateId] = useState(
    () => selectedPlateId ?? plates.at(0)?.id ?? ""
  )
  const plate = plates.find((item) => item.id === plateId) ?? null
  const fromPlate = plateOrigin(plate, connectedId, t)
  const planned = "position" in fromPlate ? fromPlate.position : null
  const [entry, setEntry] = useState<{
    readonly plateId: string
    readonly x: string
    readonly y: string
  } | null>(null)
  // Entries are the plate's until edited; choosing another plate starts from its origin again.
  const own = entry?.plateId === plateId ? entry : null
  const xText = own?.x ?? (planned ? entryText(planned[0]) : "")
  const yText = own?.y ?? (planned ? entryText(planned[1]) : "")
  const edit = (axis: "x" | "y", value: string) =>
    setEntry({ plateId, x: xText, y: yText, [axis]: value })
  const x = xText.trim() ? Number(xText) : Number.NaN
  const y = yText.trim() ? Number(yText) : Number.NaN
  const valid = Number.isFinite(x) && Number.isFinite(y)
  const action: MachineCommand = { type: "setOrigin", x, y }

  const drawn = useWorkspaceViewerPlates()
  const shown = useMemo(
    () => drawn.filter((item) => item.id === plateId),
    [drawn, plateId]
  )
  const marker = useMemo((): MachineOrigin | null => {
    if (!plate || !valid) return null
    const position = bedPositionOf(plate, [x, y, 0])
    return (
      position && {
        plateId: plate.id,
        position: [position[0], position[1], plate.setup.workOrigin[2]],
      }
    )
  }, [plate, valid, x, y])

  const availability = machine.availability.setOrigin
  let reason: string | null = null
  if (!availability.allowed)
    reason = availability.reason ?? t("common.unavailable")
  else if (!valid) reason = t("origin.enterXY")
  else if (!MachineCommandSchema.safeParse(action).success)
    reason = t("origin.outOfRange")

  const edited =
    !!own &&
    !!planned &&
    (own.x !== entryText(planned[0]) || own.y !== entryText(planned[1]))

  return (
    <AppDialog
      title={t("origin.title")}
      onClose={onClose}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            {t("common.cancel")}
          </Button>
          <ReasonButton
            label={t("origin.set")}
            reason={reason}
            disabled={command.isPending}
            onClick={() =>
              command.mutate(action, {
                onSuccess: () => {
                  toast.success(
                    t("origin.setToast", {
                      x: entryText(x),
                      y: entryText(y),
                    })
                  )
                  onClose()
                },
                onError: (error) => toast.error(error.message),
              })
            }
          >
            {t("origin.set")}
          </ReasonButton>
        </>
      }
    >
      <FieldGroup>
        <Field orientation="horizontal">
          <FieldLabel htmlFor={`${id}-plate`}>{t("origin.plate")}</FieldLabel>
          <OptionSelect
            id={`${id}-plate`}
            className="ml-auto w-56"
            options={plates.map((item, index) => ({
              value: item.id,
              label: plateLabel(item, index),
            }))}
            value={plateId}
            onValueChange={setPlateId}
          />
        </Field>
        <div
          className="relative h-[26rem] overflow-hidden rounded-lg border"
          role="img"
          aria-label={t("origin.viewerAria")}
        >
          <BedViewer
            plates={shown}
            selectedPlateId={plateId}
            onSelectPlate={NO_SELECTION}
            showRapids={false}
            showStock
            view="top"
            resetKey={Math.max(
              0,
              plates.findIndex((item) => item.id === plateId)
            )}
            zoom={1}
            machineOrigin={marker}
            labeled={false}
          />
        </div>
        <div className="flex items-end gap-2">
          <Field>
            <FieldLabel htmlFor={`${id}-x`}>
              <Hint text={t("origin.xHint")}>{t("origin.machineX")}</Hint>
            </FieldLabel>
            <MeasurementInput
              id={`${id}-x`}
              axis="X"
              unit="mm"
              type="number"
              step="any"
              aria-description={t("origin.xHint")}
              value={xText}
              onChange={(event) => edit("x", event.target.value)}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor={`${id}-y`}>
              <Hint text={t("origin.yHint")}>{t("origin.machineY")}</Hint>
            </FieldLabel>
            <MeasurementInput
              id={`${id}-y`}
              axis="Y"
              unit="mm"
              type="number"
              step="any"
              aria-description={t("origin.yHint")}
              value={yText}
              onChange={(event) => edit("y", event.target.value)}
            />
          </Field>
          <ReasonButton
            label={t("origin.usePlateOrigin")}
            variant="outline"
            size="icon"
            reason={"reason" in fromPlate ? fromPlate.reason : null}
            disabled={!edited}
            onClick={() => setEntry(null)}
          >
            <Undo2 />
          </ReasonButton>
        </div>
        {"factory" in fromPlate && fromPlate.factory && !edited && (
          <p role="status" className="text-xs text-muted-foreground">
            {t("origin.factoryAnchor")}
          </p>
        )}
        {"reason" in fromPlate && (
          <p role="status" className="text-xs text-muted-foreground">
            {fromPlate.reason}
          </p>
        )}
      </FieldGroup>
    </AppDialog>
  )
}
