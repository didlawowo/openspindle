import { useState } from "react"
import { useTranslation } from "react-i18next"
import { CircleAlert, PencilLine, Waypoints } from "lucide-react"
import type { ReactNode } from "react"
import { bedAnchors } from "@/domain/anchors/stored-anchors"
import type {
  AnchorXY,
  StoredAnchorSetup,
} from "@/domain/anchors/stored-anchors"
import { CoordinateInput } from "@/components/workspace/coordinate-input"
import { Hint } from "@/components/workspace/hint"
import { ReasonButton } from "@/components/workspace/reason-button"
import {
  Card,
  CardAction,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card"
import {
  Field,
  FieldContent,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table"
import { AnchorPositionsForm } from "./anchor-positions-form"
import type { AnchorWriting } from "./anchor-positions-form"

/** Bed coordinates show three decimals, a micrometre, as every millimetre does. */
const coordinateFormat = new Intl.NumberFormat("en-US", {
  useGrouping: false,
  minimumFractionDigits: 3,
  maximumFractionDigits: 3,
})

const STORE_HINT_KEY = "anchors.storeHint"

/** Whether the device stores the bed setups' anchors too, and why it did not store them. */
export type AnchorStoring = {
  readonly enabled: boolean
  onChange: (enabled: boolean) => void
  /** Why the device did not store them when last written, with writing them again. */
  readonly failed: { readonly error: string; onRetry: () => void } | null
}

function StoreAnchors({ storing }: { storing: AnchorStoring }) {
  const { t } = useTranslation("device")
  return (
    <FieldGroup className="gap-2">
      <Field orientation="horizontal">
        <FieldContent>
          <FieldLabel htmlFor="device-store-anchors">
            <Hint text={t(STORE_HINT_KEY)}>{t("anchors.storeLabel")}</Hint>
          </FieldLabel>
        </FieldContent>
        <Switch
          id="device-store-anchors"
          aria-description={t(STORE_HINT_KEY)}
          checked={storing.enabled}
          onCheckedChange={storing.onChange}
        />
      </Field>
      {storing.enabled && storing.failed && (
        <Field orientation="horizontal">
          <FieldError className="flex items-start gap-2">
            <CircleAlert
              className="mt-0.5 size-4 shrink-0"
              aria-hidden="true"
            />
            <span>{storing.failed.error}</span>
          </FieldError>
          <Button variant="outline" size="sm" onClick={storing.failed.onRetry}>
            {t("anchors.writeAgain")}
          </Button>
        </Field>
      )}
    </FieldGroup>
  )
}

const BED_OFFSET_HINT_KEY = "anchors.bedOffsetHint"

/**
 * Where the machine's bed model sits from where its kit places it, from the first anchor, the
 * bed's origin. It aligns the bed's holes with the anchors for display only; it never writes the
 * firmware configuration.
 */
function BedOffset({
  offset,
  onAlign,
}: {
  offset: AnchorXY
  onAlign: (offset: AnchorXY) => void
}) {
  const { t } = useTranslation("device")
  return (
    <FieldSet>
      <FieldLegend>
        <Hint text={t(BED_OFFSET_HINT_KEY)}>{t("anchors.bedOffset")}</Hint>
      </FieldLegend>
      <FieldGroup className="grid grid-cols-2 gap-3">
        <CoordinateInput
          axis="X"
          unit="mm"
          label={t("anchors.bedOffsetX")}
          value={offset[0]}
          onCommit={(value) => onAlign([value, offset[1]])}
        />
        <CoordinateInput
          axis="Y"
          unit="mm"
          label={t("anchors.bedOffsetY")}
          value={offset[1]}
          onCommit={(value) => onAlign([offset[0], value])}
        />
      </FieldGroup>
    </FieldSet>
  )
}

export function DeviceAnchors({
  setup,
  loading,
  error,
  onAlign,
  action,
  writing,
  storing,
}: {
  setup?: StoredAnchorSetup
  loading: boolean
  error?: string
  /** Moves the machine's bed from where its kit places it; absent when it cannot be edited. */
  onAlign?: (offset: AnchorXY) => void
  /** Shown in the header, such as reading the anchors again. */
  action?: ReactNode
  /** Changes the machine positions the device stores; absent when it stores none. */
  writing?: AnchorWriting
  /** Whether the device stores the bed setups' anchors too; absent where it cannot. */
  storing?: AnchorStoring
}) {
  const { t } = useTranslation("device")
  const [editing, setEditing] = useState(false)
  if (!setup && !loading && !error && !action) return null
  let sourceLabel = t("anchors.sourceDefaults")
  if (!setup) sourceLabel = t("anchors.sourceNotRead")
  if (setup?.source === "firmware-config")
    sourceLabel = t("anchors.sourceFirmware")
  if (loading) sourceLabel = t("anchors.reading")
  if (writing?.writing) sourceLabel = t("anchors.writing")
  return (
    <Card
      size="sm"
      role="region"
      className="min-w-0"
      aria-label={t("anchors.region")}
    >
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Waypoints size={16} />
          {t("anchors.title")}
        </CardTitle>
        <CardDescription>{sourceLabel}</CardDescription>
        {(action || (writing && setup)) && (
          <CardAction className="flex gap-2">
            {writing && setup && (
              <ReasonButton
                label={t("anchors.edit")}
                variant="outline"
                size="sm"
                aria-label={t("anchors.edit")}
                reason={writing.reason}
                disabled={editing}
                onClick={() => setEditing(true)}
              >
                <PencilLine data-icon="inline-start" />
                {t("anchors.editShort")}
              </ReasonButton>
            )}
            {action}
          </CardAction>
        )}
      </CardHeader>
      {setup && (
        <CardContent className="flex min-w-0 flex-col gap-4">
          <Table className="table-fixed font-numeric [&_td]:text-right [&_th:not(:first-child)]:text-right">
            <colgroup>
              <col />
              <col className="w-28" />
              <col className="w-28" />
              <col className="w-24" />
              <col className="w-24" />
            </colgroup>
            <TableHeader>
              <TableRow>
                <TableHead>{t("anchors.anchor")}</TableHead>
                <TableHead>{t("anchors.machineX")}</TableHead>
                <TableHead>{t("anchors.machineY")}</TableHead>
                <TableHead>{t("anchors.bedX")}</TableHead>
                <TableHead>{t("anchors.bedY")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bedAnchors(setup).map((anchor, index) => {
                const [machineX, machineY] =
                  setup.anchors[index].machinePosition
                return (
                  <TableRow key={anchor.id}>
                    <TableHead scope="row" className="truncate">
                      <span
                        className="mr-2 inline-block size-1.5 rounded-full bg-orange-500"
                        aria-hidden="true"
                      />
                      {anchor.name}
                    </TableHead>
                    <TableCell>{coordinateFormat.format(machineX)}</TableCell>
                    <TableCell>{coordinateFormat.format(machineY)}</TableCell>
                    <TableCell>
                      {coordinateFormat.format(anchor.position[0])}
                    </TableCell>
                    <TableCell>
                      {coordinateFormat.format(anchor.position[1])}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
          {editing && writing && (
            <AnchorPositionsForm
              anchors={setup.anchors}
              writing={writing}
              onClose={() => setEditing(false)}
            />
          )}
          {onAlign && <BedOffset offset={setup.bedOffset} onAlign={onAlign} />}
        </CardContent>
      )}
      {storing && (
        <CardContent>
          <StoreAnchors storing={storing} />
        </CardContent>
      )}
      {error && (
        <CardContent>
          <FieldError className="flex items-start gap-2" title={error}>
            <CircleAlert
              className="mt-0.5 size-4 shrink-0"
              aria-hidden="true"
            />
            <span>
              {error.startsWith("Timed out reading firmware")
                ? t("anchors.readTimedOut")
                : error}
            </span>
          </FieldError>
        </CardContent>
      )}
    </Card>
  )
}
