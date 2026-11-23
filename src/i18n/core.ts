import i18next from "i18next"
import type { Module, i18n as I18nInstance } from "i18next"
import type { AppLanguage } from "./languages"
import { enResources } from "./resources/en"
import { frResources } from "./resources/fr"

// Keys come from the English resources, the fallback of every language; the fr resources
// are typed as their shape, and i18next resolves t("a.b") over the nested keys.
declare module "i18next" {
  interface CustomTypeOptions {
    defaultNS: "settings"
    resources: typeof enResources
  }
}

/**
 * The app's translations, usable in any process: the page passes react-i18next as a
 * plugin, the main process needs none. Initialization is synchronous — the resources are
 * in the bundle, not fetched.
 */
export function createI18n(
  language: AppLanguage,
  plugins: Module[] = []
): I18nInstance {
  const instance = i18next.createInstance()
  for (const plugin of plugins) instance.use(plugin)
  void instance.init({
    lng: language,
    fallbackLng: "en",
    resources: { en: enResources, fr: frResources },
    // The page renders through React, which escapes on its own; the menus are plain strings.
    interpolation: { escapeValue: false },
  })
  return instance
}
