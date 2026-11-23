import { readFileSync, writeFileSync } from "node:fs"
import { resolveLanguage } from "../../../src/i18n/languages"
import type { AppLanguage } from "../../../src/i18n/languages"
import { log } from "../diagnostics/log"

/**
 * The language the main process draws its native menus in. It starts as the one the page
 * chose in the last run, remembered in a file of the data folder, since the page's own
 * choice lives in its storage the main process cannot read before the page is up; without
 * the file, a chosen language would show up in the menus only after the page tells it.
 * With nothing remembered, it starts as the computer's, and the page tells it the
 * language it shows once the page is up.
 */
export class LanguageService {
  private current: AppLanguage
  private readonly listeners = new Set<(language: AppLanguage) => void>()

  constructor(
    private readonly file: string,
    systemLocale: string
  ) {
    this.current = this.read(file) ?? resolveLanguage("system", systemLocale)
  }

  get language(): AppLanguage {
    return this.current
  }

  set(language: AppLanguage) {
    try {
      writeFileSync(this.file, language)
    } catch (error: unknown) {
      // The language applies all the same; it just won't be the menus' at the next launch.
      log.warn("Remembering the interface language failed", error)
    }
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

  private read(file: string): AppLanguage | null {
    let saved: string
    try {
      saved = readFileSync(file, "utf8").trim()
    } catch {
      return null
    }
    return saved === "en" || saved === "fr" ? saved : null
  }
}
