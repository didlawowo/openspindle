import { Fan, Gauge, RotateCw, Thermometer, Wind } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Card, CardContent } from "@/components/ui/card"
import type { Telemetry } from "@/machine/contract"
import { numberText } from "@/features/device/device-format"
import type { JobT } from "./job-view"

/** An output's power while it is on, Off while it is off, a dash while unknown. */
function outputText(on: boolean | null, power: number | null, t: JobT) {
  if (on === null) return "—"
  if (!on) return t("readout.off")
  return power === null ? t("readout.on") : numberText(power)
}

/**
 * The spindle's temperature and speed, the vacuum, the spindle air and the feed rate the machine
 * reports, each by its icon, over the 3D view above the work origin; a row names its reading and
 * unit on hover.
 */
export function MachineStatusCard({
  telemetry,
}: {
  telemetry: Telemetry | null
}) {
  const { t } = useTranslation("job")
  if (!telemetry) return null
  return (
    <Card
      size="sm"
      role="region"
      aria-label={t("readout.region")}
      className="w-28 shadow-lg"
    >
      <CardContent>
        <dl className="grid grid-cols-[auto_1fr] items-center gap-x-4 gap-y-1 [&_dd]:text-right [&_dd]:font-numeric [&_dt]:text-muted-foreground">
          <div className="contents" title={t("readout.temperature")}>
            <dt aria-label={t("readout.temperature")}>
              <Thermometer size={14} />
            </dt>
            <dd>{numberText(telemetry.spindleTemperature, 1)}</dd>
          </div>
          <div className="contents" title={t("readout.speed")}>
            <dt aria-label={t("readout.speed")}>
              <RotateCw size={14} />
            </dt>
            <dd>{numberText(telemetry.spindleRpm)}</dd>
          </div>
          <div className="contents" title={t("readout.vacuum")}>
            <dt aria-label={t("readout.vacuum")}>
              <Fan size={14} />
            </dt>
            <dd>{outputText(telemetry.vacuumOn, telemetry.vacuumPower, t)}</dd>
          </div>
          <div className="contents" title={t("readout.air")}>
            <dt aria-label={t("readout.air")}>
              <Wind size={14} />
            </dt>
            <dd>
              {outputText(telemetry.spindleAirOn, telemetry.spindleAirPower, t)}
            </dd>
          </div>
          <div className="contents" title={t("readout.feed")}>
            <dt aria-label={t("readout.feed")}>
              <Gauge size={14} />
            </dt>
            <dd>{numberText(telemetry.feed)}</dd>
          </div>
        </dl>
      </CardContent>
    </Card>
  )
}
