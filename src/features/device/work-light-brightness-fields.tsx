import { useEffect, useId } from "react"
import { useTranslation } from "react-i18next"
import { useForm } from "@tanstack/react-form"
import { z } from "zod"
import {
  Field,
  FieldContent,
  FieldError,
  FieldLabel,
} from "@/components/ui/field"
import {
  WorkLightIdleMinutesSchema,
  WorkLightPercentSchema,
  useWorkLightPreferences,
} from "@/components/work-light-preferences"
import { MeasurementInput } from "@/components/workspace/measurement-input"
import { Hint } from "@/components/workspace/hint"

const DAYLIGHT_HINT_KEY = "workLight.daylightHint"
const NIGHT_HINT_KEY = "workLight.nightHint"
const INACTIVITY_TIMER_HINT_KEY = "workLight.inactivityHint"

/** The schema's message is translated, so it is built where a `t` is available. */
const brightnessSchema = (errorMessage: string) =>
  z.object({
    percent: z
      .string()
      .refine(
        (value) => WorkLightPercentSchema.safeParse(Number(value)).success,
        errorMessage
      ),
  })

const inactivityTimerSchema = (errorMessage: string) =>
  z.object({
    minutes: z
      .string()
      .refine(
        (value) =>
          value.trim() !== "" &&
          WorkLightIdleMinutesSchema.safeParse(Number(value)).success,
        errorMessage
      ),
  })

/** Draft typing stays local; only a completed field updates the saved preference. */
function BrightnessField({
  label,
  hint,
  ariaLabel,
  value,
  onCommit,
}: {
  label: string
  hint: string
  ariaLabel: string
  value: number
  onCommit: (percent: number) => void
}) {
  const { t } = useTranslation("device")
  const id = useId()
  const form = useForm({
    defaultValues: { percent: String(value) },
    validators: { onChange: brightnessSchema(t("workLight.percentError")) },
    onSubmit: ({ value: submitted }) => onCommit(Number(submitted.percent)),
  })
  useEffect(() => {
    form.reset({ percent: String(value) })
  }, [form, value])
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        void form.handleSubmit()
      }}
    >
      <form.Field name="percent">
        {(field) => (
          <Field
            orientation="horizontal"
            data-invalid={!field.state.meta.isValid}
          >
            <FieldContent className="min-w-0 self-center">
              <FieldLabel htmlFor={id}>
                <Hint text={hint}>{label}</Hint>
              </FieldLabel>
              <FieldError errors={field.state.meta.errors} />
            </FieldContent>
            <div className="w-28 shrink-0">
              <MeasurementInput
                id={id}
                aria-label={ariaLabel}
                aria-description={hint}
                type="number"
                unit="%"
                min={1}
                max={100}
                step={1}
                value={field.state.value}
                aria-invalid={!field.state.meta.isValid}
                onChange={(event) => field.handleChange(event.target.value)}
                onBlur={() => {
                  field.handleBlur()
                  void form.handleSubmit()
                }}
              />
            </div>
          </Field>
        )}
      </form.Field>
    </form>
  )
}

function InactivityTimerField({
  value,
  onCommit,
}: {
  value: number
  onCommit: (minutes: number) => void
}) {
  const { t } = useTranslation("device")
  const id = useId()
  const form = useForm({
    defaultValues: { minutes: String(value) },
    validators: {
      onChange: inactivityTimerSchema(t("workLight.minutesError")),
    },
    onSubmit: ({ value: submitted }) => onCommit(Number(submitted.minutes)),
  })
  useEffect(() => {
    form.reset({ minutes: String(value) })
  }, [form, value])
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        void form.handleSubmit()
      }}
    >
      <form.Field name="minutes">
        {(field) => (
          <Field
            orientation="horizontal"
            data-invalid={!field.state.meta.isValid}
          >
            <FieldContent className="min-w-0 self-center">
              <FieldLabel htmlFor={id}>
                <Hint text={t(INACTIVITY_TIMER_HINT_KEY)}>
                  {t("workLight.inactivity")}
                </Hint>
              </FieldLabel>
              <FieldError errors={field.state.meta.errors} />
            </FieldContent>
            <div className="w-28 shrink-0">
              <MeasurementInput
                id={id}
                aria-label={t("workLight.inactivityAria")}
                aria-description={t(INACTIVITY_TIMER_HINT_KEY)}
                type="number"
                unit="min"
                min={0}
                max={1440}
                step={1}
                value={field.state.value}
                aria-invalid={!field.state.meta.isValid}
                onChange={(event) => field.handleChange(event.target.value)}
                onBlur={() => {
                  field.handleBlur()
                  void form.handleSubmit()
                }}
              />
            </div>
          </Field>
        )}
      </form.Field>
    </form>
  )
}

export function WorkLightBrightnessFields() {
  const { t } = useTranslation("device")
  const { t: tCommon } = useTranslation("common")
  const { brightness, setBrightness, idleMinutes, setIdleMinutes, saveError } =
    useWorkLightPreferences()
  return (
    <>
      <BrightnessField
        label={t("workLight.daylight")}
        hint={t(DAYLIGHT_HINT_KEY)}
        ariaLabel={t("workLight.daylightAria")}
        value={brightness.light}
        onCommit={(percent) => setBrightness("light", percent)}
      />
      <BrightnessField
        label={t("workLight.night")}
        hint={t(NIGHT_HINT_KEY)}
        ariaLabel={t("workLight.nightAria")}
        value={brightness.dark}
        onCommit={(percent) => setBrightness("dark", percent)}
      />
      <InactivityTimerField value={idleMinutes} onCommit={setIdleMinutes} />
      {saveError && <FieldError>{tCommon(saveError)}</FieldError>}
    </>
  )
}
