import { useEffect, useId, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { useForm } from "@tanstack/react-form"
import { Alert, AlertDescription } from "@/components/ui/alert"
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
import { Card, CardAction, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Textarea } from "@/components/ui/textarea"
import { ReasonButton } from "@/components/workspace/reason-button"
import { AppDialog } from "@/features/shell/app-dialog"
import { openDialog } from "@/features/shell/dialogs"
import { ConfigurationContentSchema } from "@/machine/contract"
import type { FirmwareConfiguration } from "@/machine/contract"
import {
  useMachineSnapshot,
  useReadConfiguration,
  useWriteConfiguration,
} from "@/platform/machine"

export function DeviceConfigurationCard() {
  const { t } = useTranslation("device")
  const { availability } = useMachineSnapshot()
  const entry = availability.readConfiguration
  const reason = entry.allowed
    ? null
    : (entry.reason ?? t("common.unavailable"))
  return (
    <Card size="sm" role="region" aria-label={t("firmwareConfig.title")}>
      <CardHeader>
        <CardTitle>{t("firmwareConfig.title")}</CardTitle>
        <CardAction>
          <ReasonButton
            label={t("firmwareConfig.viewEditAria")}
            variant="outline"
            size="sm"
            reason={reason}
            onClick={() => openDialog({ kind: "device-configuration" })}
          >
            {t("firmwareConfig.viewEdit")}
          </ReasonButton>
        </CardAction>
      </CardHeader>
    </Card>
  )
}

/** Preserve the original newline convention when the textarea reports normalized newlines. */
function configurationText(content: string, original: string): string {
  if (original.includes("\r\n")) return content.replace(/\r?\n/g, "\r\n")
  return content
}

/** A connection-bound copy of the file, written only by the explicit Save action. */
export function DeviceConfigurationDialog({
  onClose,
}: {
  onClose: () => void
}) {
  const { t } = useTranslation("device")
  const id = useId()
  const machine = useMachineSnapshot()
  const read = useReadConfiguration()
  const write = useWriteConfiguration()
  const [configuration, setConfiguration] =
    useState<FirmwareConfiguration | null>(null)
  const [notice, setNotice] = useState("")
  const [confirm, setConfirm] = useState<"close" | "reload" | null>(null)
  const started = useRef(false)
  const pending = read.isPending || write.isPending
  const readAvailability = machine.availability.readConfiguration
  const writeAvailability = machine.availability.writeConfiguration
  const readReason = readAvailability.allowed
    ? null
    : (readAvailability.reason ?? t("common.unavailable"))
  let writeReason = writeAvailability.allowed
    ? null
    : (writeAvailability.reason ?? t("common.unavailable"))
  const changedConnection =
    configuration !== null &&
    configuration.connectionId !== machine.connection.id
  if (!writeReason && changedConnection)
    writeReason = t("firmwareConfig.connectionChanged")
  if (!writeReason && !configuration) writeReason = t("config.readFirst")

  const form = useForm({
    // TanStack reapplies changed defaults while untouched; keep them in step with reset().
    defaultValues: { content: configuration?.content ?? "" },
    onSubmit: async ({ value }) => {
      if (
        !configuration ||
        writeReason ||
        pending ||
        value.content === configuration.content
      )
        return
      setNotice("")
      read.reset()
      try {
        const result = await write.mutateAsync({
          content: value.content,
          revision: configuration.revision,
          connectionId: configuration.connectionId,
        })
        setConfiguration(result.configuration)
        form.reset({ content: result.configuration.content })
        setNotice(
          result.afterRestart
            ? t("firmwareConfig.savedRestart")
            : t("firmwareConfig.saved")
        )
      } catch {
        // The mutation exposes its error below; keep the edited text for recovery.
      }
    },
  })

  const retrieve = () => {
    if (readReason || pending) return
    setNotice("")
    write.reset()
    read.mutate(undefined, {
      onSuccess: (result) => {
        setConfiguration(result)
        form.reset({ content: result.content })
      },
    })
  }

  useEffect(() => {
    if (started.current || !readAvailability.allowed) return
    started.current = true
    read.mutate(undefined, {
      onSuccess: (result) => {
        setConfiguration(result)
        form.reset({ content: result.content })
      },
    })
  }, [readAvailability.allowed, read.mutate, form])

  const request = (action: "close" | "reload") => {
    if (pending) return
    if (configuration && form.state.values.content !== configuration.content) {
      setConfirm(action)
      return
    }
    if (action === "close") onClose()
    else retrieve()
  }

  const failure = write.error ?? read.error
  return (
    <>
      <AppDialog
        title={t("firmwareConfig.title")}
        description={machine.connection.device?.name}
        width="wide"
        onClose={() => request("close")}
        footer={
          <>
            <ReasonButton
              label={t("firmwareConfig.reloadAria")}
              variant="outline"
              className="sm:mr-auto"
              reason={readReason}
              disabled={pending}
              onClick={() => request("reload")}
            >
              {read.isPending ? t("config.reading") : t("config.reload")}
            </ReasonButton>
            <Button
              variant="outline"
              disabled={pending}
              onClick={() => request("close")}
            >
              {t("common.close")}
            </Button>
            <form.Subscribe
              selector={(state) =>
                [state.values.content, state.canSubmit] as const
              }
            >
              {([content, canSubmit]) => (
                <ReasonButton
                  label={t("firmwareConfig.saveAria")}
                  type="submit"
                  form={`${id}-form`}
                  reason={writeReason}
                  disabled={
                    pending || !canSubmit || content === configuration?.content
                  }
                >
                  {write.isPending ? t("config.saving") : t("config.save")}
                </ReasonButton>
              )}
            </form.Subscribe>
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
            {failure && (
              <Alert variant="destructive">
                <AlertDescription>{failure.message}</AlertDescription>
              </Alert>
            )}
            {changedConnection && (
              <Alert>
                <AlertDescription>
                  {t("firmwareConfig.connectionChangedNotice")}
                </AlertDescription>
              </Alert>
            )}
            {!configuration && (
              <FieldDescription role="status">
                {read.isPending ? t("config.reading") : readReason}
              </FieldDescription>
            )}
            {configuration && (
              <form.Field
                name="content"
                validators={{ onChange: ConfigurationContentSchema }}
              >
                {(field) => (
                  <Field data-invalid={!field.state.meta.isValid}>
                    <FieldLabel htmlFor={`${id}-content`}>
                      {configuration.path}
                    </FieldLabel>
                    <Textarea
                      id={`${id}-content`}
                      className="h-[48vh] min-h-64 font-mono"
                      value={field.state.value}
                      readOnly={pending || !writeAvailability.allowed}
                      spellCheck={false}
                      autoCapitalize="off"
                      autoCorrect="off"
                      wrap="off"
                      aria-invalid={!field.state.meta.isValid}
                      onBlur={field.handleBlur}
                      onChange={(event) => {
                        setNotice("")
                        field.handleChange(
                          configurationText(
                            event.target.value,
                            configuration.content
                          )
                        )
                      }}
                    />
                    <FieldError errors={field.state.meta.errors} />
                    <FieldDescription role="status">
                      {field.state.value !== configuration.content
                        ? t("firmwareConfig.unsaved")
                        : notice}
                    </FieldDescription>
                  </Field>
                )}
              </form.Field>
            )}
          </FieldGroup>
        </form>
      </AppDialog>
      <AlertDialog
        open={confirm !== null}
        onOpenChange={(open) => {
          if (!open) setConfirm(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("firmwareConfig.discardTitle")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirm === "reload"
                ? t("firmwareConfig.discardReloadBody")
                : t("firmwareConfig.discardCloseBody")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              {t("firmwareConfig.keepEditing")}
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                const action = confirm
                setConfirm(null)
                if (action === "close") onClose()
                else if (action === "reload") retrieve()
              }}
            >
              {t("firmwareConfig.discard")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
