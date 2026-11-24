import { useEffect, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldTitle,
} from "@/components/ui/field"
import { Hint } from "@/components/workspace/hint"
import { ReasonButton } from "@/components/workspace/reason-button"
import {
  useCachedConfiguration,
  useMachineSnapshot,
  useReadConfiguration,
  useWriteConfiguration,
} from "@/platform/machine"

const MACHINE_LIGHT_TIMER_HINT_KEY = "lightTimer.hint"

/** Saved results and failures belong to their original connection. */
export function MachineLightTimerField({ pending }: { pending: boolean }) {
  const { connection } = useMachineSnapshot()
  return (
    <MachineLightTimer
      key={connection.id ?? "disconnected"}
      connectionId={connection.id}
      commandPending={pending}
    />
  )
}

/**
 * Shown only while the machine's own light timer switches a dimmed light off, from the
 * configuration the Device page has read; only Turn off changes it.
 */
function MachineLightTimer({
  connectionId,
  commandPending,
}: {
  connectionId: string | null
  commandPending: boolean
}) {
  const { t } = useTranslation("device")
  const { availability } = useMachineSnapshot()
  const configuration = useCachedConfiguration(connectionId)
  const read = useReadConfiguration()
  const write = useWriteConfiguration()
  const [saved, setSaved] = useState(false)
  const [needsReload, setNeedsReload] = useState(false)
  const mounted = useRef(true)

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])

  const minutes = configuration?.dimmingLightTimer ?? 0
  if (minutes === 0 && !saved) return null

  const pending = commandPending || read.isPending || write.isPending
  const readReason = availability.readConfiguration.allowed
    ? null
    : (availability.readConfiguration.reason ?? t("common.unavailable"))
  const writeReason = availability.writeConfiguration.allowed
    ? null
    : (availability.writeConfiguration.reason ?? t("common.unavailable"))

  const turnOff = async () => {
    if (!configuration || pending || writeReason || needsReload) return
    read.reset()
    try {
      const result = await write.mutateAsync({
        lightTimerMinutes: 0,
        revision: configuration.revision,
        connectionId: configuration.connectionId,
      })
      if (mounted.current && result.configuration.connectionId === connectionId)
        setSaved(true)
    } catch {
      // A fresh revision is needed before trying again.
      if (mounted.current) setNeedsReload(true)
    }
  }

  const reload = () => {
    if (readReason || pending) return
    write.reset()
    read.mutate(undefined, {
      onSuccess: (result) => {
        if (mounted.current && result.connectionId === connectionId)
          setNeedsReload(false)
      },
    })
  }

  const failure = write.error ?? read.error

  return (
    <>
      <Field orientation="horizontal" data-disabled={pending}>
        <FieldContent className="min-w-0 self-center">
          <FieldTitle>
            <Hint text={t(MACHINE_LIGHT_TIMER_HINT_KEY)}>
              {t("lightTimer.title")}
            </Hint>
          </FieldTitle>
          {minutes === 0 && (
            <FieldDescription role="status">
              {t("config.saved")}
            </FieldDescription>
          )}
        </FieldContent>
        <div className="flex shrink-0 items-center gap-2">
          <span className="font-numeric">
            {minutes > 0 ? `${minutes} min` : t("lightTimer.off")}
          </span>
          {minutes > 0 && (
            <ReasonButton
              label={t("lightTimer.turnOffAria")}
              aria-description={t(MACHINE_LIGHT_TIMER_HINT_KEY)}
              type="button"
              variant="outline"
              reason={writeReason}
              disabled={pending || !configuration || needsReload}
              onClick={() => void turnOff()}
            >
              {write.isPending ? t("config.saving") : t("lightTimer.turnOff")}
            </ReasonButton>
          )}
          {needsReload && (
            <ReasonButton
              label={t("lightTimer.reloadAria")}
              type="button"
              variant="outline"
              reason={readReason}
              disabled={pending}
              onClick={reload}
            >
              {t("config.reload")}
            </ReasonButton>
          )}
        </div>
      </Field>
      {failure && (
        <Alert variant="destructive">
          <AlertDescription>{failure.message}</AlertDescription>
        </Alert>
      )}
    </>
  )
}
