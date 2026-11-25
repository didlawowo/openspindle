import { useId } from "react"
import { useTranslation } from "react-i18next"
import { ArrowDownToLine, ArrowUpFromLine, Plus, X } from "lucide-react"
import { Alert, AlertAction, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Empty, EmptyHeader, EmptyTitle } from "@/components/ui/empty"
import { FieldDescription } from "@/components/ui/field"
import { Separator } from "@/components/ui/separator"
import { FilePicker } from "@/components/file-picker"
import { FILE_KINDS } from "@/platform/contract/files"
import { ToolEditor } from "./tool-editor"
import { ToolCatalogSelect, ToolSearch, ToolTable } from "./tool-table"
import { useToolLibrary } from "./use-tool-library"
import type { ToolLibrary, ToolLibraryOptions } from "./use-tool-library"

/** The files Import file offers: the extensions a tool library opens with. */
const LIBRARY_FILES = FILE_KINDS.toolLibrary.extensions
  .map((extension) => `.${extension}`)
  .join(",")

export type ToolLibraryDialogProps = ToolLibraryOptions & {
  /** "Tool library" unless a caller names what is being chosen. */
  title?: string
}

function LibraryToolbar({ library }: { library: ToolLibrary }) {
  const { t } = useTranslation("tools")
  const { busy, catalogs } = library
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5">
      <div className="flex items-center gap-1.5">
        <Button
          variant="outline"
          disabled={busy || catalogs.loading}
          onClick={library.newTool}
        >
          <Plus />
          {t("dialog.newTool")}
        </Button>
        <FilePicker
          accept={LIBRARY_FILES}
          aria-label={t("dialog.importAria")}
          onSelect={([file]) => library.importFile(file)}
        >
          {(open) => (
            <Button
              variant="ghost"
              disabled={busy}
              onClick={() => library.guard(open)}
            >
              <ArrowDownToLine />
              {t("dialog.importFile")}
            </Button>
          )}
        </FilePicker>
        <Button
          variant="ghost"
          disabled={busy || !library.hasSavedTools}
          onClick={library.exportTools}
        >
          <ArrowUpFromLine />
          {t("dialog.export")}
        </Button>
      </div>
      <ToolCatalogSelect
        controller={library.table}
        catalogs={catalogs.catalogs}
        disabled={busy}
      />
    </div>
  )
}

function CatalogStatus({ library }: { library: ToolLibrary }) {
  const { t } = useTranslation("tools")
  const { loading, error, retry } = library.catalogs
  return (
    <>
      {loading && (
        <FieldDescription className="px-4 py-2" role="status">
          {t("dialog.loadingCatalogs")}
        </FieldDescription>
      )}
      {error && (
        <Alert variant="destructive" className="mx-4 my-2 w-auto">
          <AlertDescription>{error}</AlertDescription>
          <AlertAction>
            <Button
              variant="secondary"
              size="sm"
              disabled={loading}
              onClick={retry}
            >
              {t("dialog.retry")}
            </Button>
          </AlertAction>
        </Alert>
      )}
    </>
  )
}

function UnsavedChangesPrompt({ library }: { library: ToolLibrary }) {
  const { t } = useTranslation("tools")
  const { form } = library
  return (
    <Alert className="mx-4 my-2 w-auto">
      <AlertDescription className="flex flex-wrap items-center gap-2">
        <form.Subscribe selector={(state) => state.values.name}>
          {(name) => (
            <span className="mr-auto">
              {t("dialog.saveChangesTo", {
                name: name || t("dialog.thisTool"),
              })}
            </span>
          )}
        </form.Subscribe>
        <Button size="sm" onClick={library.savePending}>
          {t("dialog.save")}
        </Button>
        <Button variant="outline" size="sm" onClick={library.discardPending}>
          {t("dialog.discard")}
        </Button>
        <Button variant="ghost" size="sm" onClick={library.cancelPending}>
          {t("dialog.cancel")}
        </Button>
      </AlertDescription>
    </Alert>
  )
}

function LibraryFeedback({ library }: { library: ToolLibrary }) {
  const { t } = useTranslation("tools")
  const { errors, importNotes } = library
  if (!errors.length && !importNotes.length) return null
  return (
    <div className="flex max-h-36 flex-col gap-2 overflow-auto px-4 py-2">
      {errors.length > 0 && (
        <Alert variant="destructive">
          <AlertDescription>
            <ul className="flex list-inside list-disc flex-col gap-1">
              {errors.slice(0, 5).map((error) => (
                <li key={error}>{error}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}
      {importNotes.length > 0 && (
        <Collapsible>
          <CollapsibleTrigger render={<Button variant="ghost" />}>
            {t("dialog.importNotes", { count: importNotes.length })}
          </CollapsibleTrigger>
          <CollapsibleContent>
            <ul className="flex list-inside list-disc flex-col gap-1 pt-2">
              {importNotes.slice(0, 30).map((note, index) => (
                <li key={index}>{note}</li>
              ))}
            </ul>
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  )
}

/** Browse, edit, import and export tools, and choose the tool to use. */
export function ToolLibraryDialog({
  title,
  ...options
}: ToolLibraryDialogProps) {
  const { t } = useTranslation("tools")
  const library = useToolLibrary(options)
  const formId = useId()
  const { busy, catalog, dirty, editing, table } = library
  const locked = busy || library.catalogs.loading
  const close = () => library.guard(options.onClose)
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) close()
      }}
    >
      <DialogContent
        showCloseButton={false}
        className="flex h-[min(780px,calc(100dvh-2rem))] w-[calc(100vw-2rem)] max-w-[1180px] flex-col gap-0 overflow-hidden p-0 sm:max-w-[1180px]"
        aria-describedby={undefined}
      >
        <DialogHeader className="flex-row items-center justify-between px-5 py-3">
          <div className="flex flex-col gap-1">
            <DialogTitle>{title ?? t("dialog.title")}</DialogTitle>
            <DialogDescription className="font-numeric">
              {t("dialog.toolsCount", { count: library.allTools.length })}
            </DialogDescription>
          </div>
          <Button
            variant="ghost"
            size="icon"
            aria-label={t("dialog.closeAria")}
            disabled={busy}
            onClick={close}
          >
            <X />
          </Button>
        </DialogHeader>
        <Separator />
        <LibraryToolbar library={library} />
        <Separator />
        <CatalogStatus library={library} />
        {library.unsavedChangesPrompt && (
          <UnsavedChangesPrompt library={library} />
        )}
        <div className="grid min-h-0 flex-1 grid-cols-[42%_1px_minmax(0,1fr)] max-sm:grid-cols-1">
          <section
            className="flex min-h-0 min-w-0 flex-col max-sm:max-h-52"
            aria-label={t("dialog.toolsRegion")}
          >
            <ToolSearch controller={table} />
            <ToolTable
              table={table.table}
              libraryEmpty={!library.allTools.length}
            />
            <Separator />
            <div className="flex items-center justify-between px-3 py-2">
              <span className="font-numeric">
                {t("dialog.shownOf", {
                  shown: table.table.getRowModel().rows.length,
                  total: library.allTools.length,
                })}
              </span>
              {library.canUndoDelete && (
                <Button
                  variant="ghost"
                  disabled={busy}
                  onClick={library.restoreDeletedTool}
                >
                  {t("dialog.undoDelete")}
                </Button>
              )}
            </div>
          </section>
          <Separator orientation="vertical" className="max-sm:hidden" />
          <Separator className="sm:hidden" />
          <section
            className="flex min-h-0 min-w-0 flex-col"
            aria-label={t("dialog.editorRegion")}
          >
            {editing ? (
              <ToolEditor
                key={editing.id}
                form={library.form}
                formId={formId}
                source={editing.source}
                tab={library.tab}
                onTabChange={library.setTab}
                catalogName={catalog?.name ?? null}
                dirty={dirty}
                busy={busy}
                catalogsLoading={library.catalogs.loading}
                canDelete={library.canDelete}
                onDuplicate={library.duplicateEditedTool}
                onDelete={library.deleteEditedTool}
              />
            ) : (
              <Empty>
                <EmptyHeader>
                  <EmptyTitle>{t("dialog.selectOrCreate")}</EmptyTitle>
                </EmptyHeader>
              </Empty>
            )}
          </section>
        </div>
        <LibraryFeedback library={library} />
        <DialogFooter className="items-center justify-between px-4 py-3">
          <span role="status">{library.status}</span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              type="submit"
              form={formId}
              disabled={
                !editing ||
                !dirty ||
                !!catalog ||
                locked ||
                library.unsavedChangesPrompt
              }
            >
              {t("dialog.saveChanges")}
            </Button>
            <Button
              disabled={!editing || busy || library.unsavedChangesPrompt}
              onClick={library.chooseEditedTool}
            >
              {t("dialog.useTool")}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
