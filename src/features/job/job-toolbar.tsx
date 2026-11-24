import { useId } from "react"
import { useTranslation } from "react-i18next"
import { Play, X } from "lucide-react"
import { Field, FieldLabel } from "@/components/ui/field"
import { Switch } from "@/components/ui/switch"
import { Hint } from "@/components/workspace/hint"
import { useMachineSnapshot } from "@/platform/machine"
import type { JobActions, MachineAction } from "./job-hooks"
import { JobStatusBadge } from "./job-status-badge"
import type { JobT, JobView } from "./job-view"
import {
  MachineActionButton,
  PauseButton,
  ResumeButton,
  StopButton,
} from "./stage-card"

/** The controls the job allows now: Run before it, then Pause, Resume and Stop, then Dismiss. */
function JobControls({
  view,
  actions,
  run,
}: {
  view: JobView
  actions: JobActions
  run: MachineAction
}) {
  const { t } = useTranslation("job")
  const { features } = useMachineSnapshot()
  switch (view.kind) {
    case "idle":
      return (
        <MachineActionButton
          action={run}
          label={t("controls.run")}
          pendingLabel={t("controls.sending")}
          variant="default"
          icon={<Play data-icon="inline-start" />}
        />
      )
    case "transferring":
    case "finishing":
      return <StopButton action={actions.stop} />
    case "running":
      return (
        <>
          <PauseButton action={actions.pause} />
          <StopButton action={actions.stop} />
        </>
      )
    case "waiting-tool":
      return (
        <>
          {/* On tool-changer machines, confirming would loosen the tool instead. */}
          {features?.atc !== true && (
            <MachineActionButton
              action={actions.confirmToolChange}
              label={t("controls.confirmInstalled")}
              variant="default"
              icon={<Play data-icon="inline-start" />}
            />
          )}
          <StopButton action={actions.stop} />
        </>
      )
    case "waiting-review":
    case "paused-before-operation":
    case "paused-program":
    case "held":
      return (
        <>
          <ResumeButton action={actions.resume} />
          <StopButton action={actions.stop} />
        </>
      )
    case "ended":
      return (
        <MachineActionButton
          action={actions.dismiss}
          label={t("controls.dismiss")}
          icon={<X data-icon="inline-start" />}
        />
      )
  }
}

/** Run keeping the tool the machine holds, which is the program's first. */
export type KeepTool = {
  readonly tool: number
  readonly kept: boolean
  readonly onKeptChange: (kept: boolean) => void
}

const keepToolHint = (tool: number, t: JobT) =>
  t("controls.keepToolHint", { tool })

function KeepToolSwitch({ keepTool }: { keepTool: KeepTool }) {
  const id = useId()
  const { t } = useTranslation("job")
  const hint = keepToolHint(keepTool.tool, t)
  return (
    <Field orientation="horizontal" className="w-auto">
      <Switch
        id={id}
        checked={keepTool.kept}
        aria-description={hint}
        onCheckedChange={keepTool.onKeptChange}
      />
      <FieldLabel htmlFor={id}>
        <Hint text={hint}>
          {t("controls.keepTool", { tool: keepTool.tool })}
        </Hint>
      </FieldLabel>
    </Field>
  )
}

/**
 * The top of the job panel, in view however far its stages scroll: the job's controls, and
 * its status once there is a job.
 */
export function JobToolbar({
  view,
  actions,
  run,
  keepTool,
}: {
  view: JobView
  actions: JobActions
  /** Disabled with the Run checklist's first blocker. */
  run: MachineAction
  /** Offered beside Run while the machine holds the program's first tool. */
  keepTool: KeepTool | null
}) {
  const { t } = useTranslation("job")
  return (
    <div
      role="toolbar"
      aria-label={t("controls.toolbarAria")}
      className="flex shrink-0 flex-wrap items-center gap-2 border-b p-3"
    >
      <JobControls view={view} actions={actions} run={run} />
      {view.kind === "idle" && keepTool && (
        <KeepToolSwitch keepTool={keepTool} />
      )}
      {view.kind !== "idle" && (
        <div className="ml-auto min-w-0">
          <JobStatusBadge view={view} />
        </div>
      )}
    </div>
  )
}
