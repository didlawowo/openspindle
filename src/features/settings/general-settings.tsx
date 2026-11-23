import { useTranslation } from "react-i18next"
import { useAppearance } from "@/components/appearance-provider"
import { useLanguage } from "@/components/language-provider"
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Switch } from "@/components/ui/switch"
import { OptionSelect } from "@/components/option-select"
import { Hint } from "@/components/workspace/hint"
import { isAppearance } from "@/lib/appearance"
import type { Appearance } from "@/lib/appearance"
import { FONTS, FONT_CHOICES, isFontFor } from "@/lib/fonts"
import type { FontRole } from "@/lib/fonts"
import { isLanguagePreference } from "@/i18n/languages"
import { useSimulatorStatus, useUpdateSimulator } from "@/platform/simulator"

const LANGUAGE_FIELDS: ReadonlyArray<{
  labelKey:
    "language.optionSystem" | "language.optionEnglish" | "language.optionFrench"
  value: "system" | "en" | "fr"
}> = [
  { labelKey: "language.optionSystem", value: "system" },
  { labelKey: "language.optionEnglish", value: "en" },
  { labelKey: "language.optionFrench", value: "fr" },
]

const FONT_FIELDS: ReadonlyArray<{
  role: FontRole
  id: string
  labelKey: "displayFont.label" | "monoFont.label"
  hintKey: "displayFont.hint" | "monoFont.hint"
}> = [
  {
    role: "sans",
    id: "display-font",
    labelKey: "displayFont.label",
    hintKey: "displayFont.hint",
  },
  {
    role: "mono",
    id: "mono-font",
    labelKey: "monoFont.label",
    hintKey: "monoFont.hint",
  },
]

const fontOptions = (role: FontRole) =>
  FONT_CHOICES[role].map((id) => ({ value: id, label: FONTS[id].label }))

/** Settings › General: the language, how the app looks, and its simulated Z1. Changes apply at once. */
export function GeneralSettings() {
  const { t } = useTranslation("settings")
  const { appearance, setAppearance, fonts, setFont, saveError } =
    useAppearance()
  const { preference, setPreference } = useLanguage()
  const simulator = useSimulatorStatus().data
  const updateSimulator = useUpdateSimulator()
  const simulatorHint = t("simulator.hint", {
    host: simulator?.host ?? "127.0.0.1",
    port: simulator?.port ?? 2222,
  })
  const simulatorError = updateSimulator.error
    ? t("couldNotSave", { message: updateSimulator.error.message })
    : simulator?.error && t("simulator.notRunning", { error: simulator.error })
  const appearanceOptions: ReadonlyArray<{
    value: Appearance
    label: string
  }> = [
    { value: "system", label: t("appearance.optionSystem") },
    { value: "light", label: t("appearance.optionLight") },
    { value: "dark", label: t("appearance.optionDark") },
  ]
  const appearanceHint = t("appearance.hint")
  return (
    <FieldGroup>
      <Field orientation="horizontal">
        <FieldLabel htmlFor="language">
          <Hint text={t("language.hint")}>{t("language.label")}</Hint>
        </FieldLabel>
        <OptionSelect
          id="language"
          aria-description={t("language.hint")}
          className="w-48"
          options={LANGUAGE_FIELDS.map(({ labelKey, value }) => ({
            value,
            label: t(labelKey),
          }))}
          value={preference}
          onValueChange={(value) => {
            if (isLanguagePreference(value)) setPreference(value)
          }}
        />
      </Field>
      <Field orientation="horizontal">
        <FieldLabel htmlFor="appearance">
          <Hint text={appearanceHint}>{t("appearance.label")}</Hint>
        </FieldLabel>
        <OptionSelect
          id="appearance"
          aria-description={appearanceHint}
          className="w-48"
          options={appearanceOptions}
          value={appearance}
          onValueChange={(value) => {
            if (isAppearance(value)) setAppearance(value)
          }}
        />
      </Field>
      {FONT_FIELDS.map(({ role, id, labelKey, hintKey }) => {
        const hint = t(hintKey)
        return (
          <Field key={role} orientation="horizontal">
            <FieldLabel htmlFor={id}>
              <Hint text={hint}>{t(labelKey)}</Hint>
            </FieldLabel>
            <OptionSelect
              id={id}
              aria-description={hint}
              className="w-48"
              options={fontOptions(role)}
              value={fonts[role]}
              onValueChange={(value) => {
                if (isFontFor(role, value)) setFont(role, value)
              }}
            />
          </Field>
        )
      })}
      {saveError && <FieldError>{saveError}</FieldError>}
      {simulator && (
        <Field orientation="horizontal">
          <FieldLabel htmlFor="z1-simulator">
            <Hint text={simulatorHint}>{t("simulator.label")}</Hint>
          </FieldLabel>
          <Switch
            id="z1-simulator"
            aria-description={simulatorHint}
            checked={simulator.settings.enabled}
            onCheckedChange={(enabled) => updateSimulator.mutate({ enabled })}
          />
        </Field>
      )}
      {simulatorError && <FieldError>{simulatorError}</FieldError>}
    </FieldGroup>
  )
}
