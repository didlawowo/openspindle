import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Switch } from "@/components/ui/switch"
import { OptionSelect } from "@/components/option-select"
import { Hint } from "@/components/workspace/hint"
import { setLogLevel } from "@/app/errors/log"
import { LogLevelSchema } from "@/platform/contract/diagnostics"
import type {
  DiagnosticsSettings,
  DiagnosticsStatus,
  LogLevel,
} from "@/platform/contract/diagnostics"
import { diagnosticsKeys, diagnosticsStatusQuery } from "@/platform/diagnostics"
import { useHost } from "@/platform/host-context"

const LOG_LEVEL_KEYS: ReadonlyArray<{
  value: LogLevel
  labelKey:
    | "privacy.levelError"
    | "privacy.levelWarning"
    | "privacy.levelInfo"
    | "privacy.levelDebug"
}> = [
  { value: "error", labelKey: "privacy.levelError" },
  { value: "warn", labelKey: "privacy.levelWarning" },
  { value: "info", labelKey: "privacy.levelInfo" },
  { value: "debug", labelKey: "privacy.levelDebug" },
]

/** Changes apply at once; a change the main process could not store is undone. */
function useUpdateDiagnosticsSettings() {
  const diagnostics = useHost().diagnostics
  const client = useQueryClient()
  return useMutation({
    mutationFn: (patch: Partial<DiagnosticsSettings>) =>
      diagnostics.updateSettings(patch),
    onMutate: async (patch) => {
      await client.cancelQueries({ queryKey: diagnosticsKeys.status })
      const previous = client.getQueryData<DiagnosticsStatus>(
        diagnosticsKeys.status
      )
      if (previous)
        client.setQueryData<DiagnosticsStatus>(diagnosticsKeys.status, {
          ...previous,
          settings: { ...previous.settings, ...patch },
        })
      return { previous }
    },
    onError: (_error, _patch, context) => {
      if (context?.previous)
        client.setQueryData(diagnosticsKeys.status, context.previous)
    },
    onSuccess: (settings) => {
      setLogLevel(settings.logLevel)
      client.setQueryData<DiagnosticsStatus>(
        diagnosticsKeys.status,
        (status) => status && { ...status, settings }
      )
    },
  })
}

/** Settings › Privacy: what the log records, and whether errors are reported without asking. */
export function PrivacySettings() {
  const { t } = useTranslation("settings")
  const host = useHost()
  const status = useQuery(diagnosticsStatusQuery(host.diagnostics))
  const update = useUpdateDiagnosticsSettings()
  if (!status.data) return null
  const { settings, reporting } = status.data
  const logLevelHint = t("privacy.debugLevelHint")
  const reportHint = t("privacy.autoReportsHint")
  return (
    <FieldGroup>
      <Field orientation="horizontal">
        <FieldLabel htmlFor="log-level">
          <Hint text={logLevelHint}>{t("privacy.debugLevel")}</Hint>
        </FieldLabel>
        <OptionSelect
          id="log-level"
          aria-description={logLevelHint}
          className="w-48"
          options={LOG_LEVEL_KEYS.map(({ value, labelKey }) => ({
            value,
            label: t(labelKey),
          }))}
          value={settings.logLevel}
          onValueChange={(value) => {
            const level = LogLevelSchema.safeParse(value)
            if (level.success) update.mutate({ logLevel: level.data })
          }}
        />
      </Field>
      {reporting && (
        <Field orientation="horizontal">
          <FieldLabel htmlFor="report-automatically">
            <Hint text={reportHint}>{t("privacy.autoReports")}</Hint>
          </FieldLabel>
          <Switch
            id="report-automatically"
            aria-description={reportHint}
            checked={settings.reportAutomatically}
            onCheckedChange={(checked) =>
              update.mutate({ reportAutomatically: checked })
            }
          />
        </Field>
      )}
      {update.error && (
        <FieldError>
          {t("couldNotSave", { message: update.error.message })}
        </FieldError>
      )}
    </FieldGroup>
  )
}
