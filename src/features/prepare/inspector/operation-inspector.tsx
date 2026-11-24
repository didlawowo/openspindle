import { useEffect, useId } from "react"
import { useTranslation } from "react-i18next"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useWorkspaceStore } from "@/app/workspace/workspace-context"
import { diagnosticOperation } from "@/domain/diagnostics"
import type { KeyedDiagnostic } from "@/domain/diagnostics"
import type { Operation } from "@/domain/operations/operation"
import { suppressedParts } from "@/domain/operations/toolpath-parts"
import { isSuppressed } from "@/domain/plate/active"
import type { Plate } from "@/domain/plate/plate"
import { Hint } from "@/components/workspace/hint"
import type { PrepareSearch } from "@/routes/_workspace/prepare"
import { useKeyedDiagnostics } from "@/app/workspace/use-plate-diagnostics"
import { useOperationKindLabel } from "@/features/prepare/use-operation-kind-label"
import { PickButton } from "@/features/probing/probing-fields"
import {
  currentPicking,
  setPicking,
  usePicking,
} from "../arrange/arrange-state"
import { useSuppressParts } from "../suppress-parts"
import { DiagnosticsList } from "./diagnostics-list"
import { NameField } from "@/components/name-field"
import { OperationEditor } from "./operation-editors"
import { OperationToolsPanel } from "./operation-tools-panel"

/** Name, Stop before and Suppress: what every operation has, whatever its kind. */
function OperationBasics({
  plate,
  operation,
}: {
  plate: Plate
  operation: Operation
}) {
  const { t } = useTranslation("prepare")
  const workspace = useWorkspaceStore()
  const id = useId()
  const target = { plateId: plate.id, operationId: operation.id }
  return (
    <FieldGroup>
      <NameField
        name={operation.name}
        onRename={(name) =>
          workspace.dispatch({ type: "operation.rename", ...target, name })
        }
      />
      <Field orientation="horizontal">
        <Switch
          id={`${id}-stop`}
          checked={operation.stopBefore}
          onCheckedChange={(value) =>
            workspace.dispatch({
              type: "operation.stopBefore",
              ...target,
              value,
            })
          }
        />
        <FieldLabel htmlFor={`${id}-stop`}>{t("op.pauseBefore")}</FieldLabel>
      </Field>
      <Field orientation="horizontal">
        <Switch
          id={`${id}-suppress`}
          checked={isSuppressed(operation)}
          aria-description={t("op.suppressHint")}
          onCheckedChange={(value) =>
            workspace.dispatch({
              type: "operation.suppress",
              ...target,
              value,
            })
          }
        />
        <FieldLabel htmlFor={`${id}-suppress`}>
          <Hint text={t("op.suppressHint")}>{t("op.suppress")}</Hint>
        </FieldLabel>
      </Field>
    </FieldGroup>
  )
}

/**
 * The paths of an operation's toolpath that can be suppressed one by one: how many run, picking
 * them in the 3D view, inverting which run, and running them all. Picking ends when the
 * operation's inspector goes.
 */
function OperationPaths({
  plate,
  operation,
}: {
  plate: Plate
  operation: Operation
}) {
  const { t } = useTranslation("prepare")
  const parts = useSuppressParts()
  const picking = usePicking()
  useEffect(
    () => () => {
      const current = currentPicking()
      if (current?.kind === "parts" && current.operationId === operation.id)
        setPicking(null)
    },
    [operation.id]
  )
  const found = suppressedParts(operation)
  if (!found?.parts.length) return null
  const count = found.parts.length
  const running = count - found.matched.size
  const active =
    picking?.kind === "parts" && picking.operationId === operation.id
  return (
    <Field>
      <FieldLabel>
        <Hint text={t("op.pathsHint")}>{t("op.paths")}</Hint>
      </FieldLabel>
      <span className="font-numeric text-sm">
        {isSuppressed(operation)
          ? t("op.pathsNone", { total: count })
          : running === count
            ? t("op.pathsAll", { total: count })
            : t("op.pathsRunning", { running, total: count })}
      </span>
      <div className="flex flex-wrap gap-2">
        <PickButton
          label={t("op.pickPaths")}
          pick={{
            picking: active,
            reason: null,
            onPick: () =>
              setPicking(
                active
                  ? null
                  : {
                      kind: "parts",
                      plateId: plate.id,
                      operationId: operation.id,
                    }
              ),
          }}
        />
        <Button
          variant="outline"
          size="sm"
          onClick={() => parts.invert(plate, operation)}
        >
          {t("op.invert")}
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={!operation.suppressedParts?.length}
          onClick={() => parts.clear(plate, operation)}
        >
          {t("op.runAll")}
        </Button>
      </div>
    </Field>
  )
}

/**
 * An operation's diagnostics as its inspector shows them. A pending PCB operation is its
 * editor's to explain, and Edit would only open the operation already open.
 */
function inspectorDiagnostics(
  diagnostics: readonly KeyedDiagnostic[],
  operationId: string
): KeyedDiagnostic[] {
  return diagnostics.flatMap((keyed) => {
    const { diagnostic } = keyed
    if (
      diagnosticOperation(diagnostic) !== operationId ||
      diagnostic.code === "operation-pending"
    )
      return []
    return diagnostic.fix?.kind === "edit-operation"
      ? [{ ...keyed, diagnostic: { ...diagnostic, fix: undefined } }]
      : [keyed]
  })
}

/** The selected operation: its source, settings and tools. */
export function OperationInspector({
  plate,
  operation,
  panel,
  onPanel,
}: {
  plate: Plate
  operation: Operation
  panel: PrepareSearch["panel"]
  onPanel: (panel: PrepareSearch["panel"]) => void
}) {
  const { t } = useTranslation("prepare")
  const diagnostics = inspectorDiagnostics(
    useKeyedDiagnostics(plate),
    operation.id
  )
  const kindLabel = useOperationKindLabel(operation)
  return (
    <Tabs
      value={panel === "tools" ? "tools" : "operation"}
      onValueChange={(value) =>
        onPanel(value === "tools" ? "tools" : undefined)
      }
      className="min-h-0 flex-1 gap-0 border-t"
    >
      <TabsList
        variant="line"
        className="w-full shrink-0 border-b px-2"
        aria-label={t("op.settingsAria")}
      >
        <TabsTrigger value="operation">{kindLabel}</TabsTrigger>
        <TabsTrigger value="tools">
          {t("inspector.tabTools")}
          <Badge variant="secondary" className="font-numeric">
            {operation.tools.length}
          </Badge>
        </TabsTrigger>
      </TabsList>
      <TabsContent
        value="operation"
        className="flex min-h-0 flex-col gap-4 overflow-y-auto p-4"
      >
        <DiagnosticsList plate={plate} diagnostics={diagnostics} />
        <OperationBasics
          key={operation.id}
          plate={plate}
          operation={operation}
        />
        <OperationPaths
          key={`${operation.id}-paths`}
          plate={plate}
          operation={operation}
        />
        <OperationEditor plate={plate} operation={operation} />
      </TabsContent>
      <TabsContent value="tools" className="min-h-0 overflow-y-auto">
        <OperationToolsPanel plate={plate} operation={operation} />
      </TabsContent>
    </Tabs>
  )
}
