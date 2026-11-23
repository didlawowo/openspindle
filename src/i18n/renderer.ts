import { initReactI18next } from "react-i18next"
import { createI18n } from "./core"
import {
  LANGUAGE_STORAGE_KEY,
  isLanguagePreference,
  resolveLanguage,
} from "./languages"
import type { LanguagePreference } from "./languages"

/** The saved language preference, or System when nothing was saved. */
export function readLanguagePreference(): LanguagePreference {
  try {
    const value = localStorage.getItem(LANGUAGE_STORAGE_KEY)
    if (isLanguagePreference(value)) return value
  } catch {
    // System language remains available when storage is unavailable.
  }
  return "system"
}

/** The language this page shows now: the saved preference, resolved against the computer's. */
export const rendererLanguage = () =>
  resolveLanguage(readLanguagePreference(), navigator.language)

/** The page's translations; components read them through react-i18next. */
export const i18n = createI18n(rendererLanguage(), [initReactI18next])
