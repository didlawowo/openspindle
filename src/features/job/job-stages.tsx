import { Alert, AlertDescription } from "@/components/ui/alert"
import { FieldDescription } from "@/components/ui/field"
import { Progress } from "@/components/ui/progress"
import { useTranslation } from "react-i18next"
import type { TFunction } from "i18next"
import { usePlateIndex } from "@/app/workspace/workspace-context"
import { plateLabel } from "@/domain/plate/plate"
import { JobFaults, JobProgressDetails } from "./job-details"
import { partLabel } from "./job-view"
import type {
  JobOutcome,
  JobSubject,
  JobView,
  JobViewOf,
  TransferStep,
} from "./job-view"
import { StageCard } from "./stage-card"

/** The job's translations, passed to the builders of stage text. */
type JobT = TFunction<"job">

const transferTexts = (
  t: JobT
): Record<TransferStep, { title: string; description: string }> => ({
  preparing: {
    title: t("transfer.preparingTitle"),
    description: t("transfer.preparingDescription"),
  },
  uploading: {
    title: t("transfer.uploadingTitle"),
    description: t("transfer.uploadingDescription"),
  },
  verifying: {
    title: t("transfer.verifyingTitle"),
    description: t("transfer.verifyingDescription"),
  },
  starting: {
    title: t("transfer.startingTitle"),
    description: t("transfer.startingDescription"),
  },
})

const outcomeTexts = (
  t: JobT
): Record<JobOutcome, { title: string; description: string }> => ({
  completed: {
    title: t("outcome.completedTitle"),
    description: t("outcome.completedDescription"),
  },
  stopped: {
    title: t("outcome.stoppedTitle"),
    description: t("outcome.stoppedDescription"),
  },
  failed: {
    title: t("outcome.failedTitle"),
    description: t("outcome.failedDescription"),
  },
  unverified: {
    title: t("outcome.unverifiedTitle"),
    description: t("outcome.unverifiedDescription"),
  },
  lost: {
    title: t("outcome.lostTitle"),
    description: t("outcome.lostDescription"),
  },
})

/** A program sent as parts has every part written and read back before the first plays. */
function transferText(view: JobViewOf<"transferring">, t: JobT) {
  const texts = transferTexts(t)
  const part = partLabel(view.job, t)?.toLowerCase()
  if (part && view.step === "uploading")
    return {
      title: t("transfer.uploadingPart", { part }),
      description: t("transfer.partsDescription"),
    }
  if (part && view.step === "verifying")
    return { ...texts.verifying, title: t("transfer.verifyingPart", { part }) }
  return texts[view.step]
}

export function TransferStage({ view }: { view: JobViewOf<"transferring"> }) {
  const { t } = useTranslation("job")
  const text = transferText(view, t)
  return (
    <StageCard title={text.title} description={text.description}>
      {view.percent !== null && (
        <Progress
          value={view.percent}
          aria-label={t("transfer.progressAria")}
        />
      )}
    </StageCard>
  )
}

export function FinishingStage({ view }: { view: JobViewOf<"finishing"> }) {
  const { t } = useTranslation("job")
  return (
    <StageCard
      title={
        view.cleaning ? t("finish.cleaningTitle") : t("finish.finishingTitle")
      }
      description={
        view.cleaning
          ? t("finish.cleaningDescription")
          : t("finish.finishingDescription")
      }
    >
      <JobProgressDetails job={view.job} subject={view.session} />
      {view.job.overdue && (
        <Alert>
          <AlertDescription>{t("finish.overdue")}</AlertDescription>
        </Alert>
      )}
      <JobFaults job={view.job} />
    </StageCard>
  )
}

export function EndedStage({ view }: { view: JobViewOf<"ended"> }) {
  const { t } = useTranslation("job")
  const text = outcomeTexts(t)[view.outcome]
  const error = view.job.error
  return (
    <StageCard
      title={text.title}
      description={error ? undefined : text.description}
    >
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <JobProgressDetails job={view.job} subject={view.session} />
      <JobFaults job={view.job} />
    </StageCard>
  )
}

/** The plate the tab is about; the job's phase shows in its toolbar. */
export function JobSummary({
  view,
  subject,
}: {
  view: JobView
  subject: JobSubject | null
}) {
  const { t } = useTranslation("job")
  const index = usePlateIndex(subject?.plate.id)
  if (view.kind === "idle")
    return (
      <div className="flex min-w-0 flex-col gap-0.5">
        <h2 className="truncate">
          {subject ? plateLabel(subject.plate, index) : t("summary.noPlate")}
        </h2>
      </div>
    )
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <h2 className="truncate">{view.session?.label ?? view.job.name}</h2>
      <FieldDescription className="font-numeric">
        {view.session
          ? t("summary.runAt", {
              time: new Date(view.job.startedAt).toLocaleTimeString(),
            })
          : t("summary.startedElsewhere")}
      </FieldDescription>
    </div>
  )
}
