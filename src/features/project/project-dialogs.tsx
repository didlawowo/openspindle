import { useTranslation } from "react-i18next"
import { CircleAlert } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { AppDialog } from "@/features/shell/app-dialog"
import { closeDialog } from "@/features/shell/dialogs"
import {
  useApplyProject,
  useSaveProject,
  useStartNewProject,
} from "./use-project"
import type { ProjectCandidate } from "./use-project"

/**
 * Replacing a project that has unsaved changes: save them first, discard them, or keep working.
 * `replace` runs once they are saved or discarded.
 */
function SaveChangesDialog({
  title,
  description,
  confirm,
  replace,
}: {
  title: string
  /** What replaces the project. */
  description: string
  /** The label of the button that saves, then replaces the project. */
  confirm: string
  replace: () => void
}) {
  const { t } = useTranslation("shell")
  const save = useSaveProject()
  const proceed = () => {
    closeDialog()
    replace()
  }
  return (
    <AlertDialog
      open
      onOpenChange={(next) => {
        if (!next && !save.isPending) closeDialog()
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>
            {description} {t("project.lostWarning")}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction
            variant="outline"
            className="sm:mr-auto"
            disabled={save.isPending}
            onClick={proceed}
          >
            {t("project.dontSave")}
          </AlertDialogAction>
          <AlertDialogCancel autoFocus disabled={save.isPending}>
            {t("project.cancel")}
          </AlertDialogCancel>
          <AlertDialogAction
            disabled={save.isPending}
            onClick={() =>
              save.mutate(undefined, {
                onSuccess: ({ result }) => {
                  if (result.status !== "canceled") proceed()
                },
              })
            }
          >
            {save.isPending ? t("project.saving") : confirm}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

/** Opening a project over unsaved changes: save them first, discard them, or keep working. */
export function OpenProjectDialog({
  candidate,
}: {
  candidate: ProjectCandidate
}) {
  const { t } = useTranslation("shell")
  const apply = useApplyProject()
  return (
    <SaveChangesDialog
      title={t("project.openTitle")}
      description={t("project.openDescription", {
        count: candidate.document.plates.length,
        file: candidate.fileName,
      })}
      confirm={t("project.saveAndOpen")}
      replace={() => apply.mutate(candidate)}
    />
  )
}

/** Starting a new project over unsaved changes: save them first, discard them, or keep working. */
export function NewProjectDialog() {
  const { t } = useTranslation("shell")
  const start = useStartNewProject()
  return (
    <SaveChangesDialog
      title={t("project.newTitle")}
      description={t("project.newDescription")}
      confirm={t("project.saveAndStart")}
      replace={() => start.mutate()}
    />
  )
}

/** How many of the fields an opened project leaves out the report names. */
const NAMED_FIELDS = 5

/** The fields of the file that the opened project leaves out, which saving does not keep. */
function LeftOutFields({ leftOut }: { leftOut: readonly string[] }) {
  const { t } = useTranslation("shell")
  const more = leftOut.length - NAMED_FIELDS
  return (
    <Alert>
      <CircleAlert />
      <AlertTitle>{t("project.leftOut", { count: leftOut.length })}</AlertTitle>
      <AlertDescription>
        <p>{t("project.leftOutExplain", { count: leftOut.length })}</p>
        <ul className="list-inside list-disc">
          {leftOut.slice(0, NAMED_FIELDS).map((path, index) => (
            <li key={`${index}:${path}`}>{path}</li>
          ))}
          {more > 0 && <li>{t("project.moreFields", { count: more })}</li>}
        </ul>
      </AlertDescription>
    </Alert>
  )
}

/** What opening a project changed or left out. */
export function ProjectReportDialog({ report }: { report: ProjectCandidate }) {
  const { t } = useTranslation("shell")
  return (
    <AppDialog
      title={t("project.openedTitle", { file: report.fileName })}
      description={t("project.openedDescription")}
      onClose={closeDialog}
      footer={<Button onClick={closeDialog}>{t("project.done")}</Button>}
    >
      <div className="flex flex-col gap-3">
        {report.leftOut.length > 0 && (
          <LeftOutFields leftOut={report.leftOut} />
        )}
        {report.notices.map((notice, index) => (
          <Alert key={`${index}:${notice}`}>
            <CircleAlert />
            <AlertDescription>{notice}</AlertDescription>
          </Alert>
        ))}
      </div>
    </AppDialog>
  )
}
