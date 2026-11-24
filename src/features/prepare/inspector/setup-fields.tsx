import { useId } from "react"
import { useTranslation } from "react-i18next"
import type { TFunction } from "i18next"
import { Crosshair } from "lucide-react"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field"
import { OptionSelect } from "@/components/option-select"
import { Hint } from "@/components/workspace/hint"
import { ASSIST_KEYS, ASSIST_LABELS } from "@/machine/contract"
import type { PlateSetup } from "@/domain/plate/plate"
import { COORDINATE_LIMIT } from "@/domain/primitives"
import type { Point3 } from "@/domain/primitives"
import type { MachineAction } from "@/features/job/job-hooks"
import { MachineActionButton } from "@/features/job/stage-card"
import {
  AnchorPlacementFields,
  RelativePointFields,
} from "./anchor-placement-fields"

type SetupFieldsProps = {
  setup: PlateSetup
  disabled?: boolean
  onChange: (patch: Partial<PlateSetup>) => void
}

const assistModeOptions = (t: TFunction<"prepare">) =>
  [
    { value: "device", label: t("setup.assistDevice") },
    { value: "on", label: t("setup.assistOn") },
    { value: "off", label: t("setup.assistOff") },
  ] as const

const STOCK_ORIGINS = {
  "": "setup.originFromStock",
  "front-left-top": "setup.originFrontLeftTop",
  "front-right-top": "setup.originFrontRightTop",
  "back-left-top": "setup.originBackLeftTop",
  "back-right-top": "setup.originBackRightTop",
  "center-top": "setup.originCenterTop",
  "front-left-bottom": "setup.originFrontLeftBottom",
  "center-bottom": "setup.originCenterBottom",
} as const
type StockOrigin = Exclude<keyof typeof STOCK_ORIGINS, "">

const isPoint = (value: readonly number[]): value is Point3 =>
  value.length === 3 &&
  value.every(
    (coordinate) =>
      Number.isFinite(coordinate) && Math.abs(coordinate) <= COORDINATE_LIMIT
  )

/** Where the stock sits on the bed, by its anchor, like each fixture. */
export function StockPlacementFields({
  setup,
  disabled,
  onChange,
}: SetupFieldsProps) {
  const { t } = useTranslation("prepare")
  return (
    <AnchorPlacementFields
      name={t("inspector.tabStock")}
      hint={t("setup.stockAnchorHint")}
      value={setup.stockAnchor}
      relativeTo={setup.stockRelativeTo}
      anchorSetup={setup.anchors}
      disabled={disabled}
      onChange={(stockAnchor) => onChange({ stockAnchor })}
      onRelativeToChange={(stockRelativeTo) => onChange({ stockRelativeTo })}
    />
  )
}

function stockOrigins(setup: PlateSetup): Partial<Record<StockOrigin, Point3>> {
  if (!setup.stock) return {}
  const [x, y, z] = setup.stockAnchor
  const { width, depth, height } = setup.stock
  return {
    "front-left-top": [x, y, z + height],
    "front-right-top": [x + width, y, z + height],
    "back-left-top": [x, y + depth, z + height],
    "back-right-top": [x + width, y + depth, z + height],
    "center-top": [x + width / 2, y + depth / 2, z + height],
    "front-left-bottom": [x, y, z],
    "center-bottom": [x + width / 2, y + depth / 2, z],
  }
}

/**
 * The plate's single work origin: every operation machines from this NC zero. Its X and Y are
 * bed coordinates, or offsets from a stored anchor it is kept relative to.
 */
export function WorkOriginFields({
  setup,
  disabled,
  zLock,
  readDevice,
  onChange,
}: SetupFieldsProps & {
  /** Why the work origin's Z is fixed; absent while it can be edited. */
  zLock?: string
  /** Reads where the connected device keeps its work zero into the work origin's X and Y. */
  readDevice?: MachineAction
}) {
  const { t } = useTranslation("prepare")
  const id = useId()
  const origins = stockOrigins(setup)
  const originOf = (value: string) =>
    Object.hasOwn(origins, value) ? origins[value as StockOrigin] : undefined
  const originOptions = Object.entries(STOCK_ORIGINS).map(([value, key]) => {
    const origin = value ? originOf(value) : undefined
    return {
      value,
      label: t(key),
      disabled:
        value !== "" &&
        (!(origin && isPoint(origin)) ||
          (zLock !== undefined && value.endsWith("-bottom"))),
    }
  })
  const onMachine = setup.machineOrigin === true
  // From stock moves X and Y, which on the machine's origin are the machine's.
  const fromStockDisabled = disabled || !setup.stock || onMachine
  return (
    <FieldSet aria-label={t("setup.origin")}>
      <FieldLegend>
        <Hint text={t("setup.workOriginHint")}>{t("setup.origin")}</Hint>
      </FieldLegend>
      <RelativePointFields
        label={t("setup.origin")}
        value={setup.workOrigin}
        relativeTo={setup.workOriginAnchor}
        anchorSetup={setup.anchors}
        disabled={disabled}
        zLock={zLock}
        machineOrigin={{
          selected: onMachine,
          lock: t("setup.machineOriginLock"),
          onSelect: () => {
            onChange({ machineOrigin: true })
            // Where the machine has it now, as the view and checks place the plate by it.
            if (readDevice && readDevice.reason === null) readDevice.run()
          },
        }}
        onChange={(workOrigin) => onChange({ workOrigin })}
        onRelativeToChange={(workOriginAnchor) =>
          onChange({ workOriginAnchor, machineOrigin: false })
        }
      />
      <div className="flex items-end gap-2">
        <Field data-disabled={fromStockDisabled}>
          <FieldLabel className="sr-only" htmlFor={`${id}-origin`}>
            {t("setup.setOriginFromStock")}
          </FieldLabel>
          <OptionSelect
            id={`${id}-origin`}
            className="w-full"
            aria-label={t("setup.setOriginFromStock")}
            options={originOptions}
            value=""
            disabled={fromStockDisabled}
            onValueChange={(value) => {
              const workOrigin = value ? originOf(value) : undefined
              if (workOrigin && isPoint(workOrigin)) onChange({ workOrigin })
            }}
          />
        </Field>
        {readDevice && (
          <MachineActionButton
            action={readDevice}
            label={t("setup.readDevice")}
            pendingLabel={t("setup.readingDevice")}
            icon={<Crosshair data-icon="inline-start" />}
          />
        )}
      </div>
    </FieldSet>
  )
}

/** Vacuum, air, bed cleaning and anti-static for the whole plate's run. */
export function AssistFields({ setup, disabled, onChange }: SetupFieldsProps) {
  const { t } = useTranslation("prepare")
  const id = useId()
  return (
    <FieldSet aria-label={t("setup.assistsAria")}>
      <FieldLegend className="flex w-full items-baseline justify-between">
        <span>{t("setup.assists")}</span>
      </FieldLegend>
      <FieldGroup className="gap-3">
        {ASSIST_KEYS.map((key) => (
          <Field
            orientation="horizontal"
            className="grid grid-cols-2 items-center gap-3"
            key={key}
            data-disabled={disabled}
          >
            <FieldLabel htmlFor={`${id}-${key}`}>
              {ASSIST_LABELS[key]}
            </FieldLabel>
            <OptionSelect
              id={`${id}-${key}`}
              className="w-full min-w-0"
              aria-label={t("setup.assistAria", { label: ASSIST_LABELS[key] })}
              options={assistModeOptions(t)}
              value={setup.assists[key]}
              disabled={disabled}
              onValueChange={(value) =>
                onChange({ assists: { ...setup.assists, [key]: value } })
              }
            />
          </Field>
        ))}
      </FieldGroup>
      {setup.assists.vacuum === "on" && (
        <FieldDescription>{t("setup.vacuumNote")}</FieldDescription>
      )}
      {setup.assists.bedClean === "on" && (
        <FieldDescription>{t("setup.bedCleanNote")}</FieldDescription>
      )}
    </FieldSet>
  )
}
