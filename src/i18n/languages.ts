/** The interface languages the app speaks; English is the fallback of every language. */
export type AppLanguage = "en" | "fr"

/** What the user chose: the computer's language, or one of the app's languages. */
export type LanguagePreference = "system" | AppLanguage

export const LANGUAGE_STORAGE_KEY = "openspindle:language"

export function isLanguagePreference(
  value: unknown
): value is LanguagePreference {
  return value === "system" || value === "en" || value === "fr"
}

/** The app language of a computer language: French for any French locale, English otherwise. */
export function languageOf(systemLocale: string): AppLanguage {
  return systemLocale.toLowerCase().startsWith("fr") ? "fr" : "en"
}

export function resolveLanguage(
  preference: LanguagePreference,
  systemLocale: string
): AppLanguage {
  return preference === "system" ? languageOf(systemLocale) : preference
}
