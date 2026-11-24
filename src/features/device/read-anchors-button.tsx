import { LoaderCircle, Waypoints } from "lucide-react"
import { useTranslation } from "react-i18next"
import { useMachineSnapshot } from "@/platform/machine"
import { ReasonButton } from "@/components/workspace/reason-button"

/** Reads the connected device's anchors again; they are read by themselves on connecting. */
export function ReadAnchorsButton({
  reading,
  onRead,
}: {
  reading: boolean
  onRead: () => void
}) {
  const { t } = useTranslation("device")
  const { availability, anchors } = useMachineSnapshot()
  const entry = availability.readAnchors
  const busy = reading || anchors.reading
  let label = t("readAnchors.label")
  if (entry.deferred) label = t("readAnchors.deferred")
  if (busy) label = t("readAnchors.reading")
  return (
    <ReasonButton
      label={t("readAnchors.label")}
      variant="outline"
      size="sm"
      aria-label={label}
      reason={entry.allowed ? null : entry.reason}
      disabled={busy}
      onClick={onRead}
    >
      {busy ? (
        <LoaderCircle className="animate-spin" data-icon="inline-start" />
      ) : (
        <Waypoints data-icon="inline-start" />
      )}
      <span>{label}</span>
    </ReasonButton>
  )
}
