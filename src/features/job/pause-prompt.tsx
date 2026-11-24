import { useTranslation } from "react-i18next"
import { JobProgressDetails } from "./job-details"
import type { JobT, JobViewOf } from "./job-view"
import { StageCard } from "./stage-card"

type PauseView = JobViewOf<
  "paused-before-operation" | "paused-program" | "held"
>

function programPauseDescription(
  view: JobViewOf<"paused-program">,
  t: JobT
): string {
  const line = view.point?.line ?? view.wait.line
  const where = line === null ? "" : t("pause.atLine", { line })
  const within = view.operation
    ? t("pause.inOperation", { name: view.operation.name })
    : ""
  return t("pause.programDescription", { where, within })
}

function pauseText(
  view: PauseView,
  t: JobT
): { title: string; description: string } {
  switch (view.kind) {
    case "paused-before-operation":
      return {
        title: view.operation
          ? t("pause.beforeOperation", { name: view.operation.name })
          : t("pause.beforeNext"),
        description: t("pause.beforeOperationDescription"),
      }
    case "paused-program":
      return {
        title: t("pause.programTitle"),
        description: programPauseDescription(view, t),
      }
    case "held":
      return {
        title: t("pause.heldTitle"),
        description: t("pause.heldDescription"),
      }
  }
}

/** A pause that waits for the user: before an operation, the NC's own stop, or a hold. */
export function PausePrompt({ view }: { view: PauseView }) {
  const { t } = useTranslation("job")
  const { title, description } = pauseText(view, t)
  return (
    <StageCard title={title} description={description}>
      <JobProgressDetails job={view.job} subject={view.session} />
    </StageCard>
  )
}
