import { useId, useState } from "react"
import { useTranslation } from "react-i18next"
import { House, Move } from "lucide-react"
import { cn } from "cn"
import { Button } from "@/components/ui/button"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import type {
  AvailabilityKey,
  Axis,
  ControlLimits,
  GoToTarget,
  MachineCommand,
} from "@/machine/contract"
import { OptionSelect } from "@/components/option-select"
import { AXIS_COLORS } from "@/components/workspace/axis-label"
import { ReasonButton } from "@/components/workspace/reason-button"
import { ControlCard } from "./device-control-card"

/** The jog steps offered, in millimetres, and speeds, in percent of the machine's maximum. */
const JOG_STEPS = [0.01, 0.1, 1, 5, 10]
const JOG_SPEEDS = [5, 10, 25]

/**
 * [axis, direction, button text, grid position, accessible label]. Y+ at the bottom: the Z1
 * moves its bed in Y, and Y+ brings it towards whoever stands in front of the machine.
 */
const JOG_BUTTONS = [
  ["Y", 1, "Y+", "col-start-2 row-start-3", "jog.yPositive"],
  ["X", -1, "X−", "col-start-1 row-start-2", "jog.xNegative"],
  ["X", 1, "X+", "col-start-3 row-start-2", "jog.xPositive"],
  ["Y", -1, "Y−", "col-start-2 row-start-1", "jog.yNegative"],
] as const

/** [direction, button text, grid row, accessible label]. */
const Z_BUTTONS = [
  [1, "Z+", "row-start-1", "jog.zPositive"],
  [-1, "Z−", "row-start-3", "jog.zNegative"],
] as const

/** The jog pads' buttons: larger than icon buttons elsewhere, to hit them easily. */
const PAD_BUTTON = "size-12 text-sm [&_svg:not([class*='size-'])]:size-5"

/** A move up to the clearance height, then over to `target` in X and Y, as Makera Studio's. */
function GoToButton({
  target,
  text,
  reason,
  allowed,
  execute,
}: {
  target: GoToTarget
  text: string
  reason: (key: AvailabilityKey, action?: MachineCommand) => string | null
  allowed: (action: MachineCommand) => boolean
  execute: (action: MachineCommand) => void
}) {
  const { t } = useTranslation("device")
  const command: MachineCommand = { type: "goTo", target }
  return (
    <Button
      variant="outline"
      size="sm"
      className="flex-1"
      title={reason("goTo", command) ?? t("jog.goToHint", { text })}
      disabled={!allowed(command)}
      onClick={() => execute(command)}
    >
      {text}
    </Button>
  )
}

/** Jog steps and speed, and the XY and Z jog pads, each axis in its colour, with homing and go-to moves. */
export function DeviceJogCard({
  limits,
  reason,
  allowed,
  execute,
}: {
  limits: ControlLimits | null
  reason: (key: AvailabilityKey, action?: MachineCommand) => string | null
  allowed: (action: MachineCommand) => boolean
  execute: (action: MachineCommand) => void
}) {
  const { t } = useTranslation("device")
  const fieldId = useId()
  const [step, setStep] = useState(1)
  const [speed, setSpeed] = useState(10)
  // Jog steps (mm) and speeds (%) the machine accepts; all of them before it reports its limits.
  const jogSteps = JOG_STEPS.filter(
    (value) =>
      !limits ||
      (value >= limits.jogMinDistance && value <= limits.jogMaxDistance)
  )
  const jogSpeeds = JOG_SPEEDS.filter(
    (value) =>
      !limits ||
      (value / 100 >= limits.jogMinSpeedScale &&
        value / 100 <= limits.jogMaxSpeedScale)
  )
  const jog = (axis: Axis, direction: number): MachineCommand => ({
    type: "jog",
    axis,
    distance: step * direction,
    speedScale: speed / 100,
  })
  const goTo = { reason, allowed, execute }
  return (
    <ControlCard title={t("jog.title")} icon={<Move size={16} />}>
      <div className="flex flex-wrap items-center gap-4">
        <div className="grid grid-cols-3 grid-rows-3 gap-1">
          {JOG_BUTTONS.map(([axis, direction, text, position, label]) => (
            <Button
              key={label}
              variant="outline"
              size="icon-lg"
              className={cn(PAD_BUTTON, position, AXIS_COLORS[axis])}
              aria-label={t(label)}
              title={reason("jog", jog(axis, direction)) ?? t(label)}
              disabled={!allowed(jog(axis, direction))}
              onClick={() => execute(jog(axis, direction))}
            >
              {text}
            </Button>
          ))}
          {/* Its own cell: a disabled ReasonButton wraps the button, which would leave its place. */}
          <div className="col-start-3 row-start-1">
            <ReasonButton
              label={t("jog.homeAll")}
              variant="outline"
              size="icon-lg"
              className={PAD_BUTTON}
              aria-label={t("jog.homeAll")}
              reason={reason("home")}
              disabled={!allowed({ type: "home" })}
              onClick={() => execute({ type: "home" })}
            >
              <House />
            </ReasonButton>
          </div>
        </div>
        {/* The XY pad's rows: Z+ beside Y− and Z− beside Y+. */}
        <div className="grid grid-rows-3 gap-1">
          {Z_BUTTONS.map(([direction, text, position, label]) => (
            <Button
              key={label}
              variant="outline"
              size="icon-lg"
              className={cn(PAD_BUTTON, position, AXIS_COLORS.Z)}
              aria-label={t(label)}
              title={reason("jog", jog("Z", direction)) ?? t(label)}
              disabled={!allowed(jog("Z", direction))}
              onClick={() => execute(jog("Z", direction))}
            >
              {text}
            </Button>
          ))}
        </div>
        <FieldGroup className="min-w-56 flex-1 gap-3">
          <Field orientation="horizontal">
            <FieldLabel id={`${fieldId}-step`} className="w-14 shrink-0">
              {t("jog.step")}
            </FieldLabel>
            <ToggleGroup
              variant="outline"
              className="w-full font-mono"
              aria-labelledby={`${fieldId}-step`}
              value={[String(step)]}
              onValueChange={(values) => {
                if (values[0]) setStep(Number(values[0]))
              }}
            >
              {jogSteps.map((value) => (
                <ToggleGroupItem
                  key={value}
                  value={String(value)}
                  className="flex-1"
                >
                  {value.toFixed(3)}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </Field>
          <Field orientation="horizontal">
            <FieldLabel htmlFor={fieldId} className="w-14 shrink-0">
              {t("jog.speed")}
            </FieldLabel>
            <OptionSelect
              id={fieldId}
              options={jogSpeeds.map((value) => ({
                value,
                label: `${value}%`,
              }))}
              value={speed}
              onValueChange={setSpeed}
              numeric
              className="w-full"
              aria-label={t("jog.speedAria")}
            />
          </Field>
          <Field orientation="horizontal">
            <FieldLabel id={`${fieldId}-go-to`} className="w-14 shrink-0">
              {t("jog.goTo")}
            </FieldLabel>
            <div className="flex w-full gap-1">
              <GoToButton
                target="clearance"
                text={t("jog.clearance")}
                {...goTo}
              />
              <GoToButton target="origin" text={t("jog.origin")} {...goTo} />
              <GoToButton target="anchor1" text={t("jog.anchor1")} {...goTo} />
              <GoToButton target="anchor2" text={t("jog.anchor2")} {...goTo} />
            </div>
          </Field>
        </FieldGroup>
      </div>
    </ControlCard>
  )
}
