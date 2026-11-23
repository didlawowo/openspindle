import { readFileSync } from "node:fs"
import { resolveLanguage } from "../../../src/i18n/languages"
import type {
  AppLanguage,
  LanguagePreference,
} from "../../../src/i18n/languages"
import { log } from "../diagnostics/log"
import { writeFileAtomic } from "./atomic-write"

/**
 * The language the main process draws its native menus in. It keeps the user's choice
 * (`system`, English or French) in a file of the data folder, and resolves `system` with
 * the computer's own locale at each start, so a remembered choice never freezes a day's
 * resolution. The choice lives here rather than only in the page's storage because the
 * page cannot speak before the menus are first built; once the page is up it tells the
 * choice it follows.
 */
export class LanguageService {
  private current: AppLanguage
  private saved: LanguagePreference
  private lastWrite: Promise<void> = Promise.resolve()
  private readonly listeners = new Set<(language: AppLanguage) => void>()

  constructor(
    private readonly file: string,
    private readonly systemLocale: string
  ) {
    this.saved = this.read() ?? "system"
    this.current = resolveLanguage(this.saved, systemLocale)
  }

  get language(): AppLanguage {
    return this.current
  }

  set(preference: LanguagePreference) {
    if (preference !== this.saved) {
      this.saved = preference
      // Chain the writes so a fast double change lands in order, and the choice still
      // applies if the write fails: it just won't be the menus' at the next launch.
      this.lastWrite = this.lastWrite
        .catch(() => {})
        .then(() => writeFileAtomic(this.file, preference))
        .catch((error: unknown) =>
          log.warn("Remembering the interface language failed", error)
        )
    }
    const language = resolveLanguage(preference, this.systemLocale)
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

  private read(): LanguagePreference | null {
    let saved: string
    try {
      saved = readFileSync(this.file, "utf8").trim()
    } catch {
      return null
    }
    return saved === "system" || saved === "en" || saved === "fr" ? saved : null
  }
}
