import { useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { useSelector } from "@tanstack/react-form"
import { useMutation } from "@tanstack/react-query"
import { toast } from "sonner"
import { useWorkspaceStore } from "@/app/workspace/workspace-context"
import type { StepId } from "@/app/workspace/history"
import {
  catalogForTool,
  mergeCatalogTools,
} from "@/app/tools/tool-catalog-store"
import {
  createTool,
  duplicateTool,
  toToolDraft,
  toolIssueMessage,
} from "@/domain/tools/tool"
import type { Tool, ToolDraft } from "@/domain/tools/tool"
import {
  exportToolLibrary,
  importToolLibrary,
} from "@/formats/tool-library/library-file"
import { FILE_KINDS } from "@/platform/contract/files"
import type { SaveFileResult } from "@/platform/contract/files"
import { useHost } from "@/platform/host-context"
import type { EditorTab } from "./tool-editor"
import { useToolForm } from "./tool-form"
import type { ToolSaveRequest } from "./tool-form"
import { describeToolError } from "./tool-format"
import { recommendTools, useToolTable } from "./tool-table"
import { useToolCatalogs } from "./use-tool-catalogs"

export interface ToolLibraryOptions {
  /** The user's saved tools; the packaged catalogs are merged in for browsing. */
  tools: readonly Tool[]
  /** The tool in use: opened first and marked with a check. */
  selectedId: string
  /** Receives every library change: saves, imports, deletions and restores. */
  onChange: (tools: Tool[]) => void
  /** "Use tool", or the next tool after the selected one is deleted. */
  onSelect: (id: string) => void
  onClose: () => void
  /** Tool types the list opens on, as "Recommended"; any tool can still be chosen. */
  recommendedKinds?: readonly string[]
  /** Choosing a tool for a caller: deleting the selected tool selects no other. */
  selectionOnly?: boolean
}

const NO_KINDS: readonly string[] = []

/** Runs against the library, after any unsaved edits were saved or discarded. */
export type LibraryAction = (library: readonly Tool[]) => void

/**
 * A footer message: a translation key with its parameters, or text that comes
 * from elsewhere (a domain error) and stays as it is. Keeping keys in state
 * means a language change re-translates what is still shown.
 */
type Message =
  | {
      key:
        | "status.savedShort"
        | "status.saved"
        | "status.exportCanceled"
        | "status.importFailed"
        | "status.exportFailed"
    }
  | { key: "status.added"; added: number; skipped: number }
  | { key: "status.tooLarge"; mb: number }
  | { text: string }

interface Feedback {
  /** The latest outcome, shown in the footer. */
  status: Message | null
  /** Import or export failures. */
  errors: Message[]
  /** Warnings from the latest import. */
  importNotes: string[]
}
const NO_FEEDBACK: Feedback = { status: null, errors: [], importNotes: [] }

/** A library file over the size its format allows. */
class LibraryTooLarge extends Error {}

const EXPORT_KEYS = {
  saved: "status.saved",
  canceled: "status.exportCanceled",
} as const satisfies Record<SaveFileResult["status"], string>

/** Form values while no tool is open; never shown or saved. */
const NO_DRAFT = toToolDraft(createTool())

async function readToolLibrary({
  file,
  library,
}: {
  file: File
  library: readonly Tool[]
}) {
  const { maxBytes } = FILE_KINDS.toolLibrary
  if (file.size > maxBytes) throw new LibraryTooLarge()
  const bytes = new Uint8Array(await file.arrayBuffer())
  return importToolLibrary(bytes, file.name, library)
}

/**
 * The tool library's state and actions: the merged tool list, the tool being
 * edited, and library changes that first resolve unsaved edits.
 */
export function useToolLibrary({
  tools,
  selectedId,
  onChange,
  onSelect,
  onClose,
  recommendedKinds = NO_KINDS,
  selectionOnly = false,
}: ToolLibraryOptions) {
  const { t } = useTranslation("tools")
  const showMessage = (message: Message) => {
    if ("text" in message) return message.text
    switch (message.key) {
      case "status.added":
        return (
          t("status.added", { count: message.added }) +
          (message.skipped
            ? t("status.skipped", { count: message.skipped })
            : "")
        )
      case "status.tooLarge":
        return t("status.tooLarge", { mb: message.mb })
      default:
        return t(message.key)
    }
  }
  const workspace = useWorkspaceStore()
  const host = useHost()
  const catalogQuery = useToolCatalogs()
  const { catalogs } = catalogQuery
  const allTools = useMemo(
    () => mergeCatalogTools(tools, catalogs),
    [tools, catalogs]
  )
  const recommendation = useMemo(
    () => recommendTools(recommendedKinds),
    [recommendedKinds]
  )
  const [editing, setEditing] = useState<Tool | null>(
    () =>
      allTools.find((tool) => tool.id === selectedId) ??
      (recommendation && allTools.find(recommendation)) ??
      allTools.at(0) ??
      null
  )
  const [tab, setTab] = useState<EditorTab>("General")
  const [feedback, setFeedback] = useState(NO_FEEDBACK)
  const [pending, setPending] = useState<LibraryAction | null>(null)
  /** The history step the latest deletion made, undone through the workspace like any edit. */
  const [deletedStep, setDeletedStep] = useState<StepId | null>(null)
  const current = editing
    ? allTools.find((tool) => tool.id === editing.id)
    : undefined

  const save = (draft: ToolDraft, request: ToolSaveRequest) => {
    const saved: Tool = {
      ...structuredClone(draft),
      source: editing?.source ?? null,
    }
    const library = tools.some((tool) => tool.id === saved.id)
      ? tools.map((tool) => (tool.id === saved.id ? saved : tool))
      : [...tools, saved]
    onChange(library)
    setFeedback((previous) => ({
      ...previous,
      status: { key: "status.savedShort" },
      errors: [],
    }))
    request.afterSave?.(library)
  }
  const draftDefaults = useMemo(
    () => (editing ? toToolDraft(editing) : NO_DRAFT),
    [editing]
  )
  const form = useToolForm(draftDefaults, save)
  const savedDraft = useMemo(
    () => (current ? JSON.stringify(toToolDraft(current)) : null),
    [current]
  )
  const dirty = useSelector(
    form.store,
    (state) => editing !== null && JSON.stringify(state.values) !== savedDraft
  )
  const schemaIssues = useSelector(
    form.store,
    (state) => state.errorMap.onDynamic
  )
  /** The packaged catalog of an unchanged catalog tool, which is read-only. */
  const catalog = useMemo(
    () => (current && !dirty ? catalogForTool(current, catalogs) : null),
    [current, dirty, catalogs]
  )

  const importLibrary = useMutation({ mutationFn: readToolLibrary })
  const exportLibrary = useMutation({
    mutationFn: async (library: readonly Tool[]) =>
      host.files.save({
        kind: "toolLibrary",
        suggestedName: `openspindle-tool-library-${new Date().toISOString().slice(0, 10)}.zip`,
        contents: exportToolLibrary(library),
      }),
  })
  const busy = importLibrary.isPending || exportLibrary.isPending

  /** Runs `action` now, or once unsaved edits are saved or discarded. */
  const guard = (action: LibraryAction) => {
    if (busy) return
    if (dirty) setPending(() => action)
    else action(tools)
  }
  const edit = (tool: Tool | null) => {
    setEditing(tool)
    form.reset(tool ? toToolDraft(tool) : NO_DRAFT)
    setFeedback((previous) => ({ ...previous, status: null, errors: [] }))
  }
  const table = useToolTable({
    tools: allTools,
    catalogs,
    recommendation,
    inUseId: selectedId,
    editingId: editing?.id ?? null,
    disabled: busy,
    onEditTool: (tool) =>
      guard((library) =>
        edit(library.find((item) => item.id === tool.id) ?? tool)
      ),
  })

  const errors = [
    ...new Set([
      ...feedback.errors.map(showMessage),
      ...Object.values(schemaIssues ?? {})
        .flat()
        .map((issue) => describeToolError(toolIssueMessage(issue))),
    ]),
  ]
  let status = feedback.status ? showMessage(feedback.status) : ""
  if (!status && dirty) status = t("status.unsavedChanges")
  if (importLibrary.isPending) status = t("status.importing")
  if (exportLibrary.isPending) status = t("status.exporting")

  return {
    catalogs: catalogQuery,
    /** Library and catalog tools, merged. */
    allTools,
    hasSavedTools: tools.length > 0,
    table,
    form,
    /** The tool open in the editor, as it was opened. */
    editing,
    catalog,
    canDelete: !catalog && !!current && tools.length > 1,
    dirty,
    busy,
    tab,
    setTab,
    status,
    /** Import or export failures and validation problems, in editor wording. */
    errors,
    importNotes: feedback.importNotes,
    unsavedChangesPrompt: pending !== null,
    canUndoDelete: deletedStep !== null,
    guard,
    newTool: () =>
      guard((library) => {
        edit(createTool(mergeCatalogTools(library, catalogs)))
        table.revealMyTools()
        setTab("General")
      }),
    duplicateEditedTool: () =>
      guard((library) => {
        const original =
          library.find((tool) => tool.id === editing?.id) ?? current
        if (!original) return
        table.revealMyTools()
        edit(duplicateTool(original, mergeCatalogTools(library, catalogs)))
      }),
    deleteEditedTool: () =>
      guard((library) => {
        if (!editing) return
        const { id } = editing
        const remaining = library.filter((tool) => tool.id !== id)
        // library.tools is always an edit, and removing the edited tool always changes it.
        onChange(remaining)
        setDeletedStep(workspace.history.latestStep)
        const next = remaining.at(0) ?? null
        edit(next)
        if (!selectionOnly && selectedId === id && next) onSelect(next.id)
      }),
    /** Undoes the deletion's own step, like a removal's toast, while it is still the latest. */
    restoreDeletedTool: () =>
      guard(() => {
        if (deletedStep === null) return
        if (
          !workspace.undo(deletedStep) &&
          workspace.history.holds(deletedStep)
        )
          toast.info(t("status.undoBlocked"))
        setDeletedStep(null)
      }),
    importFile: (file: File) => {
      setFeedback(NO_FEEDBACK)
      importLibrary.mutate(
        { file, library: tools },
        {
          onSuccess: (result, { library }) => {
            onChange([...library, ...result.tools])
            table.revealMyTools()
            const first = result.tools.at(0)
            if (first) edit(first)
            setFeedback({
              status: {
                key: "status.added",
                added: result.tools.length,
                skipped: result.skipped,
              },
              errors: [],
              importNotes: result.warnings,
            })
          },
          onError: (error) =>
            setFeedback({
              ...NO_FEEDBACK,
              errors: [
                error instanceof LibraryTooLarge
                  ? {
                      key: "status.tooLarge",
                      mb: FILE_KINDS.toolLibrary.maxBytes / 1024 / 1024,
                    }
                  : error instanceof Error && error.message
                    ? { text: error.message }
                    : { key: "status.importFailed" },
              ],
            }),
        }
      )
    },
    exportTools: () =>
      guard((library) => {
        setFeedback((previous) => ({ ...previous, status: null, errors: [] }))
        exportLibrary.mutate(library, {
          onSuccess: (result) =>
            setFeedback((previous) => ({
              ...previous,
              status: { key: EXPORT_KEYS[result.status] },
            })),
          onError: (error) =>
            setFeedback((previous) => ({
              ...previous,
              errors: [
                error instanceof Error && error.message
                  ? { text: error.message }
                  : { key: "status.exportFailed" },
              ],
            })),
        })
      }),
    /** Saves pending edits first, then selects the edited tool and closes. */
    chooseEditedTool: () => {
      if (!editing) return
      const { id } = editing
      const finish: LibraryAction = (library) => {
        // A catalog tool is copied into the library the first time it is used.
        if (catalog && current && !library.some((tool) => tool.id === id))
          onChange([...library, structuredClone(current)])
        onSelect(id)
        onClose()
      }
      if (dirty) void form.handleSubmit({ afterSave: finish })
      else finish(tools)
    },
    savePending: () => {
      if (!pending) return
      void form.handleSubmit({
        afterSave: (library) => {
          setPending(null)
          pending(library)
        },
      })
    },
    discardPending: () => {
      if (!pending) return
      setPending(null)
      edit(current ?? null)
      pending(tools)
    },
    cancelPending: () => setPending(null),
  }
}
export type ToolLibrary = ReturnType<typeof useToolLibrary>
