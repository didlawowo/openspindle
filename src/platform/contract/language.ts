import { z } from "zod"

/**
 * What the user chose for the interface, as the page tells it. The words match
 * `LanguagePreference` (src/i18n/languages); each side resolves `system` with its own locale,
 * and the main process keeps the choice, not one day's resolution, in its file.
 */
export const LanguagePreferenceSchema = z.enum(["system", "en", "fr"])

/** The interface language: the page tells the main process the choice it follows. */
export const appMethods = {
  "app.setLanguage": {
    params: z.strictObject({ preference: LanguagePreferenceSchema }),
    result: z.undefined(),
  },
}
