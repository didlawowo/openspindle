import { render } from "@testing-library/react"
import { beforeEach, describe, expect, test, vi } from "vitest"
import { i18n } from "@/i18n/renderer"
import { I18nextProvider } from "react-i18next"
import { AppearanceProvider, useAppearance } from "./appearance-provider"
import { APPEARANCE_STORAGE_KEY } from "@/lib/appearance"

function renderProvider(systemDark = false) {
  // jsdom has no matchMedia; the provider reads the system's appearance through it.
  window.matchMedia = vi.fn().mockImplementation((media: string) => ({
    matches: systemDark,
    media,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  }))
  const seen: { appearance: unknown; resolved: unknown }[] = []
  function Consumer() {
    const { appearance, resolvedAppearance } = useAppearance()
    seen.push({ appearance, resolved: resolvedAppearance })
    return null
  }
  render(
    <I18nextProvider i18n={i18n}>
      <AppearanceProvider>
        <Consumer />
      </AppearanceProvider>
    </I18nextProvider>
  )
  return seen
}

describe("AppearanceProvider", () => {
  beforeEach(() => localStorage.removeItem(APPEARANCE_STORAGE_KEY))

  test("with no saved choice the context starts and stays light", () => {
    const seen = renderProvider()
    expect(seen[0]).toEqual({ appearance: "light", resolved: "light" })
    expect(seen[seen.length - 1]).toEqual({
      appearance: "light",
      resolved: "light",
    })
  })

  test("a saved dark reaches the context from the first render", () => {
    localStorage.setItem(APPEARANCE_STORAGE_KEY, "dark")
    const seen = renderProvider()
    expect(seen[0]).toEqual({ appearance: "dark", resolved: "dark" })
  })

  test("a saved system resolves through the system's appearance", () => {
    localStorage.setItem(APPEARANCE_STORAGE_KEY, "system")
    let seen = renderProvider(false)
    expect(seen[0]).toEqual({ appearance: "system", resolved: "light" })
    seen = renderProvider(true)
    expect(seen[0]).toEqual({ appearance: "system", resolved: "dark" })
  })
})
