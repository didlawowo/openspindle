import { FastForward } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { OptionSelect } from "@/components/option-select"
import { Hint } from "@/components/workspace/hint"
import type { ConnectedDevice } from "@/machine/contract"
import { SIMULATOR_SPEEDS } from "@/platform/contract/simulator"
import {
  isAppSimulator,
  useSimulatorStatus,
  useUpdateSimulator,
} from "@/platform/simulator"
import { ControlCard } from "./device-control-card"

const SPEED_OPTIONS = SIMULATOR_SPEEDS.map((speed) => ({
  value: speed,
  label: `${speed}×`,
}))

const SPEED_HINT_KEY = "simulator.speedHint"

/** The app's simulator, while it is the connected device: how fast it moves. */
export function DeviceSimulatorCard({
  device,
}: {
  device: ConnectedDevice | null
}) {
  const { t } = useTranslation("device")
  const status = useSimulatorStatus().data
  const update = useUpdateSimulator()
  if (!status || !isAppSimulator(device, status)) return null
  return (
    <ControlCard title={t("simulator.title")} icon={<FastForward size={16} />}>
      <Field orientation="horizontal">
        <FieldLabel htmlFor="simulator-speed">
          <Hint text={t(SPEED_HINT_KEY)}>{t("simulator.speed")}</Hint>
        </FieldLabel>
        <OptionSelect
          id="simulator-speed"
          aria-description={t(SPEED_HINT_KEY)}
          className="w-28"
          numeric
          options={SPEED_OPTIONS}
          value={status.settings.speed}
          onValueChange={(speed) => update.mutate({ speed })}
        />
      </Field>
      {update.error && (
        <FieldError>
          {t("simulator.speedError", { message: update.error.message })}
        </FieldError>
      )}
    </ControlCard>
  )
}
