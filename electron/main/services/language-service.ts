import { app } from "electron"
import { resolveLanguage } from "../../../src/i18n/languages"
import type { AppLanguage } from "../../../src/i18n/languages"

/**
 * The language the main process draws its native menus in. It starts as the computer's,
 * and the page tells it the language it shows once the page is up.
 */
export class LanguageService {
  private current: AppLanguage = resolveLanguage("system", app.getLocale())
  private readonly listeners = new Set<(language: AppLanguage) => void>()

  get language(): AppLanguage {
    return this.current
  }

  set(language: AppLanguage) {
    if (language === this.current) return
    this.current = language
    for (const listener of this.listeners) listener(language)
  }

  subscribe(listener: (language: AppLanguage) => void): () => void {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }
}
