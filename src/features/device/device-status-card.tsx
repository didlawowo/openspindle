import { Pause, Play } from "lucide-react"
import { useTranslation } from "react-i18next"
import {
  Card,
  CardAction,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import type {
  AvailabilityKey,
  ConnectedDevice,
  MachineCommand,
  MachineFeatures,
  Telemetry,
} from "@/machine/contract"
import {
  useCompiledPlate,
  useSelectedPlate,
} from "@/app/workspace/workspace-context"
import { DeviceCamera } from "@/components/workspace/device-camera"
import { SimulatedCamera } from "@/features/viewer/simulated-camera"
import { Hint } from "@/components/workspace/hint"
import { ReasonButton } from "@/components/workspace/reason-button"
import { numberText, toolText } from "./device-format"

const TOOL_OFFSET_HINT_KEY = "status.toolOffsetHint"

/** The camera, live telemetry and the running program's progress, with pause and resume. */
export function DeviceStatusCard({
  device,
  features,
  telemetry,
  pending,
  reason,
  execute,
}: {
  device: ConnectedDevice | null
  features: MachineFeatures | null
  telemetry: Telemetry | null
  pending: boolean
  reason: (key: AvailabilityKey, action?: MachineCommand) => string | null
  execute: (action: MachineCommand) => void
}) {
  const { t } = useTranslation("device")
  const plate = useSelectedPlate()
  const compiled = useCompiledPlate(plate)
  const shown = plate && compiled ? { plate, compiled } : null
  return (
    <>
      <DeviceCamera
        device={device}
        available={features?.camera === true}
        simulated={<SimulatedCamera shown={shown} />}
      />
      <Card size="sm" role="region" aria-label={t("status.region")}>
        <CardContent>
          <dl className="grid grid-cols-4 gap-4 [&_dd]:font-numeric">
            <div className="flex flex-col gap-1">
              <dt className="text-muted-foreground">{t("status.feedRate")}</dt>
              <dd>
                {numberText(telemetry?.feed)}{" "}
                <span className="text-muted-foreground">mm/min</span>
              </dd>
            </div>
            <div className="flex flex-col gap-1">
              <dt className="text-muted-foreground">{t("status.spindle")}</dt>
              <dd>
                {numberText(telemetry?.spindleRpm)}{" "}
                <span className="text-muted-foreground">rpm</span>
              </dd>
            </div>
            <div className="flex flex-col gap-1">
              <dt className="text-muted-foreground">{t("status.tool")}</dt>
              <dd>{toolText(telemetry?.tool)}</dd>
            </div>
            <div className="flex flex-col gap-1">
              <dt className="text-muted-foreground">
                <Hint text={t(TOOL_OFFSET_HINT_KEY)}>
                  {t("status.toolOffset")}
                </Hint>
              </dt>
              <dd>
                {numberText(telemetry?.toolOffset, 3)}{" "}
                <span className="text-muted-foreground">mm</span>
              </dd>
            </div>
          </dl>
        </CardContent>
        <CardFooter className="gap-2">
          <ReasonButton
            label={t("status.pause")}
            variant="outline"
            size="sm"
            reason={reason("pause")}
            disabled={pending}
            onClick={() => execute({ type: "pause" })}
          >
            <Pause />
            {t("status.pause")}
          </ReasonButton>
          {telemetry?.state === "Tool" && !features?.atc && (
            <ReasonButton
              label={t("status.toolInstalled")}
              variant="outline"
              size="sm"
              reason={reason("confirmToolChange")}
              disabled={pending}
              onClick={() => execute({ type: "confirmToolChange" })}
            >
              <Play />
              {t("status.toolInstalled")}
            </ReasonButton>
          )}
          {telemetry?.state !== "Tool" && (
            <ReasonButton
              label={t("status.resume")}
              variant="outline"
              size="sm"
              reason={reason("resume")}
              disabled={pending}
              onClick={() => execute({ type: "resume" })}
            >
              <Play />
              {t("status.resume")}
            </ReasonButton>
          )}
        </CardFooter>
      </Card>
      {telemetry?.job && (
        <Card size="sm" role="region" aria-label={t("status.jobRegion")}>
          <CardHeader>
            <CardTitle>{t("status.currentProgram")}</CardTitle>
            <CardAction className="font-numeric">
              {numberText(telemetry.job.percent)}%
            </CardAction>
          </CardHeader>
          <CardContent>
            <Progress
              value={telemetry.job.percent}
              max={100}
              aria-label={t("status.progress")}
            />
          </CardContent>
          <CardFooter className="justify-between gap-2 font-numeric">
            <span>
              {t("status.line", { number: numberText(telemetry.job.line) })}
            </span>
            <span>
              {`${Math.floor(telemetry.job.elapsedSeconds / 60)}:${String(Math.floor(telemetry.job.elapsedSeconds % 60)).padStart(2, "0")}`}
            </span>
          </CardFooter>
        </Card>
      )}
    </>
  )
}
