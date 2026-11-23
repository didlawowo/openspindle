import { z } from "zod"

/**
 * The language the main process draws its native menus in, as the page tells it.
 * The words match `AppLanguage` (src/i18n/languages), which the page resolves to.
 */
export const AppLanguageSchema = z.enum(["en", "fr"])

/** The interface language: the page tells the main process which one it shows. */
export const appMethods = {
  "app.setLanguage": {
    params: z.strictObject({ language: AppLanguageSchema }),
    result: z.undefined(),
  },
}
