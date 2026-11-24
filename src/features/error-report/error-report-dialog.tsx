import { useEffect, useId, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { useForm } from "@tanstack/react-form"
import { useMutation, useQuery } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group"
import { Textarea } from "@/components/ui/textarea"
import { sendErrorReport } from "@/app/errors/reports"
import type { ErrorReport, ReportAttachment } from "@/app/errors/reports"
import {
  useWorkspace,
  useWorkspaceStore,
} from "@/app/workspace/workspace-context"
import { encodeWorkspace } from "@/features/project/encode-project"
import { AppDialog } from "@/features/shell/app-dialog"
import { suggestedProjectName } from "@/features/project/project-file"
import { FILE_KINDS } from "@/platform/contract/files"
import { diagnosticsStatusQuery } from "@/platform/diagnostics"
import { useHost } from "@/platform/host-context"
import { newIssueUrl } from "./github-issue"

type ReportFields = {
  description: string
  attachLog: boolean
  attachProject: boolean
}

/** The log helps with any report; a project is the user's work, sent only when they choose. */
const REPORT_DEFAULTS: ReportFields = {
  description: "",
  attachLog: true,
  attachProject: false,
}

/** The error's id in Sentry, to quote: the dialog shows it for screenshots too. */
function ErrorIdField({ id, eventId }: { id: string; eventId: string }) {
  const { t } = useTranslation("shell")
  const input = useRef<HTMLInputElement>(null)
  const [copied, setCopied] = useState(false)
  useEffect(() => {
    if (!copied) return
    const timer = setTimeout(() => setCopied(false), 2000)
    return () => clearTimeout(timer)
  }, [copied])
  return (
    <Field>
      <FieldLabel htmlFor={id}>{t("error.errorId")}</FieldLabel>
      <InputGroup>
        <InputGroupInput
          ref={input}
          id={id}
          readOnly
          value={eventId}
          className="font-mono"
        />
        <InputGroupAddon align="inline-end">
          <InputGroupButton
            onClick={() =>
              void navigator.clipboard.writeText(eventId).then(
                () => setCopied(true),
                // Refused, the ID is selected to copy by hand.
                () => input.current?.select()
              )
            }
          >
            {copied ? t("error.copied") : t("error.copy")}
          </InputGroupButton>
        </InputGroupAddon>
      </InputGroup>
    </Field>
  )
}

/**
 * An error, with its id, and what the user can do about it: send a report with a description
 * and, if they choose, the log and the project; save the log; or open a GitHub issue. Builds
 * that do not report errors offer only the last two.
 */
export function ErrorReportDialog({
  report,
  onClose,
}: {
  report: ErrorReport
  onClose: () => void
}) {
  const { t } = useTranslation("shell")
  const id = useId()
  const host = useHost()
  const workspace = useWorkspaceStore()
  const projectName = useWorkspace((state) =>
    suggestedProjectName(state.project.fileName)
  )
  const status = useQuery(diagnosticsStatusQuery(host.diagnostics))
  const reporting = status.data?.reporting ?? false

  const send = useMutation({
    mutationFn: async (fields: ReportFields) => {
      const attachments: ReportAttachment[] = []
      if (fields.attachLog)
        attachments.push({
          filename: "openspindle.log",
          data: await host.diagnostics.readLog(),
          contentType: "text/plain",
        })
      if (fields.attachProject) {
        const { contents } = await encodeWorkspace(workspace.state, host)
        attachments.push({
          filename: projectName,
          data: contents,
          contentType: FILE_KINDS.project.mime,
        })
      }
      await sendErrorReport(
        host.diagnostics,
        report,
        fields.description,
        attachments
      )
    },
  })
  const exportLog = useMutation({
    mutationFn: () => host.diagnostics.exportLog(),
  })
  const form = useForm({
    defaultValues: REPORT_DEFAULTS,
    onSubmit: ({ value }) => send.mutateAsync(value).catch(() => undefined),
  })
  const locked = send.isPending || send.isSuccess

  const openIssue = () =>
    window.open(
      newIssueUrl(report, status.data?.app, form.getFieldValue("description")),
      "_blank"
    )

  const sendLabel = () => {
    if (send.isSuccess) return t("error.sent")
    if (send.isPending) return t("error.sending")
    return t("error.send")
  }

  return (
    <AppDialog
      title={t("error.title")}
      description={
        <span className="line-clamp-4 break-words">
          {report.error.message || report.error.name}
        </span>
      }
      onClose={onClose}
      footer={
        <>
          <Button
            variant="outline"
            className="sm:mr-auto"
            disabled={exportLog.isPending}
            onClick={() => exportLog.mutate()}
          >
            {t("error.downloadLog")}
          </Button>
          <Button variant="outline" onClick={openIssue}>
            {t("error.openIssue")}
          </Button>
          {reporting && (
            <Button type="submit" form={`${id}-form`} disabled={locked}>
              {sendLabel()}
            </Button>
          )}
        </>
      }
    >
      <form
        id={`${id}-form`}
        onSubmit={(event) => {
          event.preventDefault()
          void form.handleSubmit()
        }}
      >
        <FieldGroup>
          <ErrorIdField id={`${id}-event`} eventId={report.eventId} />
          {reporting && (
            <>
              <form.Field name="description">
                {(field) => (
                  <Field>
                    <FieldLabel htmlFor={`${id}-description`}>
                      {t("error.doingWhat")}
                    </FieldLabel>
                    <Textarea
                      id={`${id}-description`}
                      autoFocus
                      value={field.state.value}
                      disabled={locked}
                      onChange={(event) =>
                        field.handleChange(event.target.value)
                      }
                    />
                  </Field>
                )}
              </form.Field>
              <form.Field name="attachLog">
                {(field) => (
                  <Field orientation="horizontal">
                    <Checkbox
                      id={`${id}-log`}
                      checked={field.state.value}
                      disabled={locked}
                      onCheckedChange={(checked) => field.handleChange(checked)}
                    />
                    <FieldLabel htmlFor={`${id}-log`}>
                      {t("error.attachLog")}
                    </FieldLabel>
                  </Field>
                )}
              </form.Field>
              <form.Field name="attachProject">
                {(field) => (
                  <Field orientation="horizontal">
                    <Checkbox
                      id={`${id}-project`}
                      checked={field.state.value}
                      disabled={locked}
                      onCheckedChange={(checked) => field.handleChange(checked)}
                    />
                    <FieldLabel htmlFor={`${id}-project`}>
                      {t("error.attachProject", { name: projectName })}
                    </FieldLabel>
                  </Field>
                )}
              </form.Field>
            </>
          )}
          {send.error && (
            <FieldError>
              {t("error.notSent", { message: send.error.message })}
            </FieldError>
          )}
          {exportLog.error && (
            <FieldError>
              {t("error.logNotSaved", { message: exportLog.error.message })}
            </FieldError>
          )}
        </FieldGroup>
      </form>
    </AppDialog>
  )
}
