import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react"
import type { ReactNode } from "react"
import { I18nextProvider } from "react-i18next"
import { log } from "@/app/errors/log"
import { i18n, readLanguagePreference } from "@/i18n/renderer"
import {
  LANGUAGE_STORAGE_KEY,
  isLanguagePreference,
  resolveLanguage,
} from "@/i18n/languages"
import type { LanguagePreference } from "@/i18n/languages"
import { useHost } from "@/platform/host-context"

const LanguageContext = createContext<{
  preference: LanguagePreference
  setPreference: (preference: LanguagePreference) => void
} | null>(null)

/**
 * The interface language, kept in this page's storage as the appearance is, and told to
 * the main process, which rebuilds the native menus with it. Changes apply at once.
 */
export function LanguageProvider({ children }: { children: ReactNode }) {
  const host = useHost()
  const [preference, setPreferenceState] = useState<LanguagePreference>(
    readLanguagePreference
  )

  useEffect(() => {
    const syncPreference = () => setPreferenceState(readLanguagePreference())
    const onStorage = (event: StorageEvent) => {
      if (event.key === null || event.key === LANGUAGE_STORAGE_KEY) {
        syncPreference()
      }
    }
    window.addEventListener("storage", onStorage)
    return () => window.removeEventListener("storage", onStorage)
  }, [])

  useEffect(() => {
    const language = resolveLanguage(preference, navigator.language)
    document.documentElement.lang = language
    void i18n.changeLanguage(language)
    host.app
      .setLanguage(language)
      .catch((error: unknown) =>
        log.warn("Telling the main process the language failed", error)
      )
  }, [preference, host])

  const setPreference = useCallback((value: LanguagePreference) => {
    if (!isLanguagePreference(value)) return
    setPreferenceState(value)
    try {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, value)
    } catch {
      // The language is applied all the same; it just won't be kept for the next launch.
    }
  }, [])

  return (
    <LanguageContext.Provider value={{ preference, setPreference }}>
      <I18nextProvider i18n={i18n}>{children}</I18nextProvider>
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (!context)
    throw new Error("useLanguage must be used within a LanguageProvider.")
  return context
}
