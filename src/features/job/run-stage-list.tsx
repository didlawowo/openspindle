import { Fragment } from "react"
import type { ReactNode } from "react"
import { useTranslation } from "react-i18next"
import {
  CircleCheck,
  CircleDashed,
  CircleMinus,
  CirclePause,
  CircleX,
  Square,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Spinner } from "@/components/ui/spinner"
import { AxisLabel, AxisValue } from "@/components/workspace/axis-label"
import { numberText } from "@/features/device/device-format"
import { formatMillimetres } from "@/domain/geometry/millimetres"
import type { Operation } from "@/domain/operations/operation"
import {
  PROBE_3D_CORNER_LABELS,
  findsCorner,
} from "@/domain/probing/tasks/origin/params"
import type { OriginParams } from "@/domain/probing/tasks/origin/params"
import {
  foundPosition,
  originResult,
} from "@/domain/probing/tasks/origin/result"
import { placementHeight } from "@/domain/probing/placement"
import { outlineTarget } from "@/domain/probing/tasks/outline/params"
import { itemEdges, sameEdge } from "@/domain/plate/item-edges"
import { kitForPlate } from "@/domain/fixtures/catalog"
import { methodFor } from "@/domain/probing/strategies"
import {
  PROBE_3D_TOOL,
  PROBE_TOOL,
  boundTools,
} from "@/domain/tools/tool-table"
import { programParts } from "@/machine/contract"
import type {
  ContactsMeasurement,
  GridMeasurement,
  HeightMap,
  JobState,
} from "@/machine/contract"
import type { Tool } from "@/domain/tools/tool"
import { cn } from "@/lib/utils"
import {
  HeightMapFacts,
  HeightMapGrid,
} from "@/components/workspace/height-map-grid"
import { operationKindLabel } from "@/features/prepare/use-operation-kind-label"
import type { OperationSettings } from "@/domain/compile/operation-settings"
import { HeightMapReviewStep } from "./height-map-review-step"
import { JobFaults, JobProgressDetails } from "./job-details"
import {
  OperationSettingsRow,
  useOperationSettings,
} from "./operation-settings"
import type { JobActions } from "./job-hooks"
import { EndedStage, FinishingStage, TransferStage } from "./job-stages"
import type { JobSubject, JobT, JobView } from "./job-view"
import { PausePrompt } from "./pause-prompt"
import { RunChecklistCard } from "./run-checklist-card"
import { SaveAsAnchor } from "./save-as-anchor"
import type { RunChecklist } from "./run-checklist"
import { useReadAnchorsFix } from "@/features/prepare/quick-fix"
import { runStages } from "./run-stages"
import type { OperationStage, StageStatus } from "./run-stages"
import { StageCard } from "./stage-card"
import { ToolChangePrompt } from "./tool-change-prompt"

const STATUS: Record<StageStatus, { icon: LucideIcon | null }> = {
  pending: { icon: CircleDashed },
  active: { icon: null },
  waiting: { icon: CirclePause },
  done: { icon: CircleCheck },
  failed: { icon: CircleX },
  stopped: { icon: Square },
  skipped: { icon: CircleMinus },
}

/** A stage that is not the current one: its status, what it does or did, and its results. */
function StageItem({
  title,
  status,
  description,
  children,
}: {
  title: string
  status: StageStatus
  description?: ReactNode
  children?: ReactNode
}) {
  const { t } = useTranslation("job")
  const { icon: Icon } = STATUS[status]
  const label = {
    pending: t("status.upNext"),
    active: t("status.running"),
    waiting: t("status.waiting"),
    done: t("status.done"),
    failed: t("status.failed"),
    stopped: t("status.stopped"),
    skipped: t("status.notRun"),
  }[status]
  return (
    <Card
      size="sm"
      role="region"
      aria-label={title}
      data-status={status}
      className={cn(
        (status === "pending" || status === "skipped") && "opacity-70"
      )}
    >
      <CardHeader>
        <CardTitle className="flex min-w-0 items-center gap-2">
          {Icon ? (
            <Icon className="size-4 shrink-0" aria-hidden />
          ) : (
            <Spinner className="size-4 shrink-0" aria-hidden />
          )}
          <span className="truncate">{title}</span>
        </CardTitle>
        <CardAction className="text-muted-foreground">{label}</CardAction>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      {/* Details that render nothing leave no empty section behind. */}
      <CardContent className="flex flex-col gap-3 empty:hidden">
        {children}
      </CardContent>
    </Card>
  )
}

const mm = (value: number) => formatMillimetres(Number(value.toFixed(3)))

/** A coordinate as the Device page's coordinates show it: to three decimals, a micrometre. */
const coordinate = (value: number) => numberText(value, 3)

/** A stored anchor and the X and Y from it, each axis as `AxisValue` sets it. */
function AnchorOffset({
  name,
  offset,
}: {
  name: string
  offset: readonly number[]
}) {
  return (
    <>
      {name} + <AxisValue axis="X" value={coordinate(offset[0])} />{" "}
      <AxisValue axis="Y" value={coordinate(offset[1])} />
    </>
  )
}

/** What an operation does, before it has run. */
function operationSummary(
  operation: Operation,
  subject: JobSubject,
  tools: readonly Tool[],
  t: JobT
): ReactNode {
  const { source } = operation
  const probing = source.kind === "probing" ? source : null
  switch (probing?.task) {
    case "touch-off": {
      const { placement } = probing.params
      return (
        <>
          {t("summary.touchOff.touchesTop")}{" "}
          {placement.kind === "anchor" ? (
            <>
              {t("summary.at")}{" "}
              <AnchorOffset
                name={anchorName(subject, placement.anchorId, t)}
                offset={placement.offset}
              />
            </>
          ) : (
            t("summary.touchOff.belowProbe")
          )}{" "}
          {t("summary.touchOff.setsWorkZ")} <AxisLabel axis="Z" />{" "}
          {t("summary.touchOff.there")}
        </>
      )
    }
    case "grid": {
      const [columns, rows] = probing.params.points
      const [width, depth] = probing.params.size
      return t("summary.grid", {
        columns,
        rows,
        width: mm(width),
        depth: mm(depth),
      })
    }
    case "outline": {
      const target = outlineTarget(probing.params)
      if (target.kind === "toolpath") return t("summary.outlineToolpath")
      const edges = itemEdges(subject.plate.setup)
      const names = target.edges.map(
        (ref) =>
          edges.find((edge) => sameEdge(edge.ref, ref))?.label ??
          t("summary.missingEdge", { side: ref.side })
      )
      return t("summary.outlineEdges", { names: names.join(", ") })
    }
    case "origin": {
      const { placement } = probing.params
      const height = placementHeight(placement)
      const z = height !== undefined && (
        <AxisValue axis="Z" value={coordinate(height)} />
      )
      return (
        <>
          {t("summary.origin.finds")} {probe3dTarget(probing.params, t)}{" "}
          {placement.kind === "anchor" ? (
            <>
              {t("summary.origin.from")}{" "}
              <AnchorOffset
                name={anchorName(subject, placement.anchorId, t)}
                offset={placement.offset}
              />
              {z && <> {z}</>}
            </>
          ) : (
            <>
              {t("summary.origin.fromProbe")}
              {z && (
                <>
                  {" "}
                  {t("summary.origin.at")} {z}
                </>
              )}
            </>
          )}{" "}
          {t("summary.origin.setsOrigin")}
        </>
      )
    }
    default: {
      const names = toolNames(operation, subject, tools)
      return names.length
        ? names.join(", ")
        : t("summary.noToolChange", { kind: operationKindLabel(operation) })
    }
  }
}

function anchorName(subject: JobSubject, anchorId: string, t: JobT): string {
  return (
    subject.plate.setup.anchors?.anchors.find(
      (anchor) => anchor.id === anchorId
    )?.name ?? t("summary.anchorFallback")
  )
}

/** "T1 · name" for each tool the operation's program changes to, as the plate was run. */
function toolNames(
  operation: Operation,
  subject: JobSubject,
  tools: readonly Tool[]
): string[] {
  return [
    ...new Set(
      subject.compiled.sections
        .filter(
          (section) =>
            section.kind === "tool-change" &&
            section.operationId === operation.id &&
            section.tool !== null
        )
        .map((section) => section.tool as number)
    ),
  ].map((number) => {
    const toolId = subject.plate.tools.find(
      (entry) => entry.number === number
    )?.toolId
    const tool = tools.find((item) => item.id === toolId)
    return tool ? `T${number} · ${tool.name}` : `T${number}`
  })
}

/** A probed grid as the height-map table shows it; unmeasured points stay empty. */
const gridMap = (grid: GridMeasurement): HeightMap => ({
  columns: grid.columns,
  rows: grid.rows,
  heights: grid.heights,
  xCoordinates: grid.xCoordinates,
  yCoordinates: grid.yCoordinates,
  raw: "",
  receivedAt: grid.at,
  deviceId: "job",
})

/** How far the machine got with a grid. */
function gridText(grid: GridMeasurement, t: JobT): string {
  switch (grid.status) {
    case "probing":
      return t("grid.probing")
    case "failed":
      return t("grid.failed")
    case "completed":
      return t("grid.completed")
  }
}

/** What a 3D probing operation finds, in words. */
function probe3dTarget({ routine, corner, axes }: OriginParams, t: JobT) {
  const at = PROBE_3D_CORNER_LABELS[corner].toLowerCase()
  const across = axes === "xy" ? t("probe3d.acrossXY") : axes.toUpperCase()
  switch (routine) {
    case "outside-corner":
      return t("probe3d.outsideCorner", { corner: at })
    case "inside-corner":
      return t("probe3d.insideCorner", { corner: at })
    case "pocket-center":
      return t("probe3d.pocketCenter", { axes: across })
    case "boss-center":
      return t("probe3d.bossCenter", { axes: across })
  }
}

/** What a 3D probing routine that has not found what it probes did, by its stage's status. */
function probe3dUnfinished(params: OriginParams, status: StageStatus, t: JobT) {
  const target = probe3dTarget(params, t)
  switch (status) {
    case "failed":
    case "stopped":
      return t("probe3d.stoppedBefore", { target })
    case "done":
      return t("probe3d.noContacts", { target })
    default:
      return t("probe3d.probing", { target })
  }
}

/** A labelled value of an operation's results. */
type Fact = { label: string; value: ReactNode }

/** A machine Z, its axis in its colour. */
function Height({ z }: { z: number }) {
  return <AxisValue axis="Z" value={coordinate(z)} />
}

/**
 * Where a 3D probing routine set the work origin, from the contacts it reported, and once it is
 * done the machine X and Y it found, to keep as an anchor.
 */
function probe3dFacts(
  params: OriginParams,
  ball: number,
  { contacts }: ContactsMeasurement,
  status: StageStatus,
  t: JobT
): {
  description: ReactNode
  facts: Fact[]
  found: readonly [number, number] | null
} {
  const result = originResult(params, ball, contacts)
  const found = status === "done" ? foundPosition(result) : null
  const set = (["X", "Y"] as const).flatMap((axis, index) => {
    const value = result.origin[index]
    return value === null ? [] : [{ axis, value }]
  })
  const facts: Fact[] = []
  if (result.top !== null)
    facts.push({ label: t("facts.top"), value: <Height z={result.top} /> })
  const size = result.size.filter((value) => value !== null)
  if (size.length)
    facts.push({
      label:
        params.routine === "pocket-center"
          ? t("facts.pocket")
          : t("facts.boss"),
      value: `${size.map(mm).join(" × ")} mm`,
    })
  facts.push({ label: t("facts.contacts"), value: String(contacts.length) })
  if (!result.complete || !set.length)
    return {
      description: probe3dUnfinished(params, status, t),
      facts,
      found,
    }
  const feature = findsCorner(params.routine)
    ? t("probe3d.featureCorner")
    : t("probe3d.featureCenter")
  return {
    found,
    description: (
      <>
        {t("probe3d.foundIntro", { feature })}{" "}
        {set.map(({ axis }) => (
          <Fragment key={axis}>
            <AxisValue axis={axis} value="0" joined />{" "}
          </Fragment>
        ))}
        {t("probe3d.foundThere")}
        {set.map(({ axis, value }) => (
          <Fragment key={axis}>
            {" "}
            <AxisValue axis={axis} value={coordinate(value)} />
          </Fragment>
        ))}
        {result.top !== null && (
          <>
            {" "}
            {t("probe3d.foundAnd")} <AxisValue axis="Z" value="0" joined />{" "}
            {t("probe3d.foundOnTop")}
          </>
        )}
        .
      </>
    ),
    facts,
  }
}

/** A tool measured at the tool sensor, by what it is. */
function sensorLabel(tool: number | null, t: JobT): string {
  if (tool === PROBE_TOOL) return t("sensor.probeAtSensor")
  if (tool === PROBE_3D_TOOL) return t("sensor.probe3dAtSensor")
  if (tool === null) return t("sensor.toolAtSensor")
  return t("sensor.toolNAtSensor", { tool })
}

/** What the machine measured in an operation, or what it will do there, and what it sets. */
function operationResults(
  stage: OperationStage,
  subject: JobSubject,
  tools: readonly Tool[],
  settings: OperationSettings | undefined,
  t: JobT
): { description: ReactNode; details: ReactNode } {
  const { operation, surface, grid, contacts, status } = stage
  const facts: Fact[] = []
  let description: ReactNode = null
  let found: readonly [number, number] | null = null
  const { source } = operation
  // The probe's ball, as the plate's table held it when the job ran.
  const probeId =
    source.kind === "probing"
      ? boundTools(subject.plate, operation).get(source.probe)
      : undefined
  const ball = tools.find((tool) => tool.id === probeId)?.diameter ?? null
  if (
    contacts &&
    source.kind === "probing" &&
    source.task === "origin" &&
    ball !== null
  ) {
    const probed = probe3dFacts(source.params, ball, contacts, status, t)
    description = probed.description
    facts.push(...probed.facts)
    found = probed.found
  }
  if (surface) {
    const [x, y, z] = surface.machine
    const { work } = surface
    description = (
      <>
        {t("touch.atMachine")} <AxisValue axis="X" value={coordinate(x)} />{" "}
        <AxisValue axis="Y" value={coordinate(y)} />
        {work && (
          <>
            , {t("touch.work")}{" "}
            <AxisValue axis="X" value={coordinate(work[0])} />{" "}
            <AxisValue axis="Y" value={coordinate(work[1])} />,
          </>
        )}{" "}
        {t("touch.setWork")} <AxisValue axis="Z" value="0" joined />{" "}
        {t("touch.there")}
      </>
    )
    facts.push({ label: t("facts.stockTop"), value: <Height z={z} /> })
  }
  if (grid) {
    const measured = grid.heights
      .flat()
      .filter((value) => value !== null).length
    description = gridText(grid, t)
    facts.push(
      { label: t("facts.grid"), value: `${grid.columns} × ${grid.rows}` },
      {
        label: t("facts.measured"),
        value: `${measured} / ${grid.columns * grid.rows}`,
      }
    )
    if (grid.range !== null)
      facts.push({ label: t("facts.range"), value: `${mm(grid.range)} mm` })
  }
  for (const tool of stage.tools)
    facts.push({
      label: sensorLabel(tool.tool, t),
      value: <Height z={tool.machine[2]} />,
    })
  if (
    !surface &&
    !grid &&
    status === "done" &&
    source.kind === "probing" &&
    (source.task === "touch-off" || source.task === "grid")
  ) {
    // OpenSpindle's own touch-off reports nothing; the machine's cycles report from an anchor.
    const machine = kitForPlate(subject.plate).probing
    const method = machine && methodFor(source, machine, subject.plate)
    description =
      machine && method && !machine.cycles.includes(method)
        ? t("touch.g38Only")
        : t("touch.anchorOnly")
  }
  return {
    description: description ?? operationSummary(operation, subject, tools, t),
    details: (
      <>
        {settings && <OperationSettingsRow settings={settings} />}
        {facts.length > 0 && <HeightMapFacts facts={facts} />}
        {grid && <HeightMapGrid map={gridMap(grid)} compact />}
        {found && <SaveAsAnchor position={found} plate={subject.plate} />}
      </>
    ),
  }
}

function OperationItem({
  stage,
  subject,
  tools,
  settings,
}: {
  stage: OperationStage
  subject: JobSubject
  tools: readonly Tool[]
  settings: OperationSettings | undefined
}) {
  const { t } = useTranslation("job")
  const { description, details } = operationResults(
    stage,
    subject,
    tools,
    settings,
    t
  )
  return (
    <StageItem
      title={stage.operation.name}
      status={stage.status}
      description={description}
    >
      {details}
    </StageItem>
  )
}

/** The current operation while the machine runs it on its own: progress, results so far. */
function RunningOperation({
  view,
  stage,
  subject,
  tools,
  settings,
}: {
  view: Extract<JobView, { kind: "running" }>
  stage: OperationStage | null
  subject: JobSubject | null
  tools: readonly Tool[]
  settings: OperationSettings | undefined
}) {
  const { t } = useTranslation("job")
  const results =
    stage && subject
      ? operationResults(stage, subject, tools, settings, t)
      : null
  return (
    <StageCard
      title={stage?.operation.name ?? t("status.running")}
      description={results?.description ?? t("running.machineRuns")}
    >
      <JobProgressDetails
        job={view.job}
        subject={view.session}
        withOperation={!stage}
      />
      {results?.details}
      <JobFaults job={view.job} />
    </StageCard>
  )
}

/** The prompt or progress of the stage the job is in, which replaces its compact card. */
function CurrentStage({
  view,
  stage,
  subject,
  tools,
  settings,
  actions,
}: {
  view: JobView
  stage: OperationStage | null
  subject: JobSubject | null
  tools: readonly Tool[]
  settings: OperationSettings | undefined
  actions: JobActions
}) {
  switch (view.kind) {
    case "running":
      return (
        <RunningOperation
          view={view}
          stage={stage}
          subject={subject}
          tools={tools}
          settings={settings}
        />
      )
    case "waiting-tool":
      return (
        <ToolChangePrompt
          view={view}
          operation={stage?.operation ?? null}
          confirm={actions.confirmToolChange}
        />
      )
    case "waiting-review":
      return <HeightMapReviewStep view={view} />
    case "paused-before-operation":
    case "paused-program":
    case "held":
      return <PausePrompt view={view} />
    default:
      return null
  }
}

/** The end of the run: its progress while it finishes, its outcome once it has ended. */
function FinishItem({ view, status }: { view: JobView; status: StageStatus }) {
  const { t } = useTranslation("job")
  if (view.kind === "finishing") return <FinishingStage view={view} />
  if (view.kind === "ended") return <EndedStage view={view} />
  return (
    <StageItem
      title={t("finish.title")}
      status={status}
      description={t("finish.description")}
    />
  )
}

/** What the upload sent: every file, and how many when the program went as parts. */
function uploadedText(job: JobState, t: JobT): string {
  const parts = programParts(job.program)
  const bytes = parts.reduce((sum, part) => sum + part.bytes, 0)
  const size = `${(bytes / 1000).toLocaleString(undefined, { maximumFractionDigits: 1 })} kB`
  return parts.length > 1
    ? t("upload.parts", { size, count: parts.length })
    : t("upload.single", { size })
}

/**
 * The run as stages, one card each: the checks before Run, the upload, every operation of the
 * plate with what the machine measured in it, and the end. The stage the job is in shows its
 * prompt or progress; the others stay compact. The job's controls are in its toolbar.
 */
export function RunStageList({
  view,
  subject,
  tools,
  actions,
  checklist,
  parts,
}: {
  view: JobView
  subject: JobSubject | null
  /** The library tools the plate's tool table names: the Run session's during a job. */
  tools: readonly Tool[]
  actions: JobActions
  checklist: RunChecklist
  /** The files the checked program is sent as. */
  parts: number
}) {
  const { t } = useTranslation("job")
  const stages = runStages(view, subject)
  const settings = useOperationSettings(subject)
  const readAnchors = useReadAnchorsFix(subject?.plate.id ?? null)
  const operations = stages.operations
  const current =
    operations?.findIndex(
      (stage) => stage.status === "active" || stage.status === "waiting"
    ) ?? -1
  const inOperation =
    view.kind !== "idle" &&
    view.kind !== "transferring" &&
    view.kind !== "finishing" &&
    view.kind !== "ended"
  const currentStage = current >= 0 ? operations![current] : null
  const prompt = inOperation ? (
    <CurrentStage
      view={view}
      stage={currentStage}
      subject={subject}
      tools={tools}
      settings={
        currentStage ? settings?.get(currentStage.operation.id) : undefined
      }
      actions={actions}
    />
  ) : null
  return (
    <ol className="flex flex-col gap-2" aria-label={t("list.aria")}>
      <li>
        {view.kind === "idle" ? (
          <RunChecklistCard
            parts={parts}
            checklist={checklist}
            readAnchors={readAnchors}
          />
        ) : (
          <StageItem
            title={t("checks.title")}
            status={stages.preflight}
            description={t("checks.passedAt", {
              time: new Date(view.job.startedAt).toLocaleTimeString(),
            })}
          />
        )}
      </li>
      <li>
        {view.kind === "transferring" ? (
          <TransferStage view={view} />
        ) : (
          <StageItem
            title={t("upload.title")}
            status={stages.transfer}
            description={
              view.kind === "idle"
                ? t("upload.description")
                : uploadedText(view.job, t)
            }
          />
        )}
      </li>
      {/* Before the first operation, or for a job whose plate is unknown here. */}
      {prompt && current < 0 && <li>{prompt}</li>}
      {subject &&
        operations?.map((stage, index) => (
          <li key={stage.operation.id}>
            {index === current && prompt ? (
              prompt
            ) : (
              <OperationItem
                stage={stage}
                subject={subject}
                tools={tools}
                settings={settings?.get(stage.operation.id)}
              />
            )}
          </li>
        ))}
      <li>
        <FinishItem view={view} status={stages.finish} />
      </li>
    </ol>
  )
}
