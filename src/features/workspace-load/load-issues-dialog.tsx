import { useTranslation } from "react-i18next"
import { useMutation } from "@tanstack/react-query"
import { TriangleAlert } from "lucide-react"
import { toast } from "sonner"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { FieldError } from "@/components/ui/field"
import { ScrollArea } from "@/components/ui/scroll-area"
import type { TFunction } from "i18next"
import type { PersistedDocument } from "@/persistence/document"
import { useDocumentState, usePersistence } from "@/persistence/persistence"
import { useHost } from "@/platform/host-context"

const TITLES = {
  library: "storage.libraryTitle",
  fixtures: "storage.fixtureTitle",
} as const

function dialogTitle(
  t: TFunction<"shell">,
  newer: boolean,
  unreadable: boolean
) {
  if (newer) return t("storage.newerTitle")
  if (unreadable) return t("storage.unreadableTitle")
  return t("storage.partialTitle")
}

/**
 * Shown whenever stored data did not load cleanly. Until the user decides, nothing is
 * written, so the stored data stays exactly as it was.
 */
export function LoadIssuesDialog() {
  const { t } = useTranslation("shell")
  const persistence = usePersistence()
  const host = useHost()
  const states = {
    library: useDocumentState(persistence.library),
    fixtures: useDocumentState(persistence.fixtures),
  }
  const blocked = (Object.keys(states) as (keyof typeof states)[])
    .filter((key) => states[key].phase === "blocked")
    .map((key) => ({
      key,
      state: states[key],
      document: persistence[key] as PersistedDocument<unknown>,
    }))
  const unreadable = blocked.some((entry) => entry.state.unreadable)
  const newer = blocked.some((entry) => entry.state.newer)

  const saveCopy = useMutation({
    mutationFn: async () => {
      const copies = Object.fromEntries(
        await Promise.all(
          blocked.map(async (entry) => [entry.key, await entry.document.raw()])
        )
      )
      return host.files.save({
        kind: "recovery",
        suggestedName: `openspindle-recovery-${new Date().toISOString().slice(0, 10)}.json`,
        contents: JSON.stringify(copies, null, 2),
      })
    },
    onSuccess: (result) => {
      if (result.status !== "canceled")
        toast.success(t("storage.copySaved", { file: result.fileName }))
    },
  })
  const resolve = useMutation({
    mutationFn: async (action: "accept" | "clear") => {
      const backups = []
      for (const entry of blocked)
        backups.push(
          action === "accept"
            ? await entry.document.accept()
            : await entry.document.clear()
        )
      return backups.flatMap((backup) => (backup ? [backup.location] : []))
    },
    onSuccess: (locations) => {
      if (locations.length)
        toast.success(t("storage.backedUp"), {
          description: locations.join("\n"),
        })
    },
  })
  const busy = saveCopy.isPending || resolve.isPending
  const error = saveCopy.error ?? resolve.error

  if (!blocked.length) return null
  return (
    <AlertDialog open>
      <AlertDialogContent className="sm:max-w-lg">
        <AlertDialogHeader>
          <AlertDialogMedia>
            <TriangleAlert />
          </AlertDialogMedia>
          <AlertDialogTitle>
            {dialogTitle(t, newer, unreadable)}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {t("storage.nothingOverwritten")}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <ScrollArea className="max-h-60">
          <dl className="flex flex-col gap-3">
            {blocked.map((entry) => (
              <div key={entry.key} className="flex flex-col gap-1">
                <dt>{t(TITLES[entry.key])}</dt>
                {entry.state.issues.map((issue, index) => (
                  <dd key={index} className="text-muted-foreground">
                    {issue.message}
                  </dd>
                ))}
              </div>
            ))}
          </dl>
        </ScrollArea>
        {error && <FieldError>{error.message}</FieldError>}
        <AlertDialogFooter>
          <AlertDialogAction
            variant="outline"
            className="sm:mr-auto"
            disabled={busy}
            onClick={() => saveCopy.mutate()}
          >
            {t("storage.saveCopy")}
          </AlertDialogAction>
          {newer && (
            <AlertDialogAction
              variant="outline"
              disabled={busy}
              onClick={() => window.close()}
            >
              {t("storage.quit")}
            </AlertDialogAction>
          )}
          {!unreadable && (
            <AlertDialogAction
              variant="outline"
              disabled={busy}
              onClick={() => resolve.mutate("accept")}
            >
              {t("storage.continueWithout")}
            </AlertDialogAction>
          )}
          <AlertDialogAction
            variant="destructive"
            disabled={busy}
            onClick={() => resolve.mutate("clear")}
          >
            {t("storage.clearFresh")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
