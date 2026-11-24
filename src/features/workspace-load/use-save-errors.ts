import { useEffect } from "react"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"
import type { PersistedDocument } from "@/persistence/document"
import { useDocumentState, usePersistence } from "@/persistence/persistence"

/** Keeps a document's save failure on screen until a later save succeeds. */
function useSaveErrorToast<TValue>(
  document: PersistedDocument<TValue>,
  id: string,
  title: string
) {
  const error = useDocumentState(document).saveError
  useEffect(() => {
    if (error)
      toast.error(title, { id, description: error, duration: Infinity })
    else toast.dismiss(id)
  }, [error, id, title])
}

/** Stored data that stops saving (a failed write, or a refused save) is reported, never lost silently. */
export function useSaveErrors() {
  const { t } = useTranslation("shell")
  const persistence = usePersistence()
  useSaveErrorToast(
    persistence.library,
    "save-library",
    t("storage.libraryNotSaved")
  )
  useSaveErrorToast(
    persistence.fixtures,
    "save-fixtures",
    t("storage.fixturesNotSaved")
  )
}
