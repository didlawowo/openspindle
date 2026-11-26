import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"
import {
  APPEARANCE_INIT_SCRIPT,
  APPEARANCE_STORAGE_KEY,
  applyAppearance,
  readAppearance,
} from "./appearance"

describe("readAppearance", () => {
  beforeEach(() => localStorage.removeItem(APPEARANCE_STORAGE_KEY))

  test("a launch with no saved choice starts in light", () => {
    expect(readAppearance()).toBe("light")
  })

  test("a saved choice wins over the default", () => {
    for (const saved of ["system", "light", "dark"] as const) {
      localStorage.setItem(APPEARANCE_STORAGE_KEY, saved)
      expect(readAppearance()).toBe(saved)
    }
  })

  test("a saved value that is not an appearance falls back to light", () => {
    localStorage.setItem(APPEARANCE_STORAGE_KEY, "sepia")
    expect(readAppearance()).toBe("light")
  })

  test("storage that throws falls back to light", () => {
    const getItem = vi
      .spyOn(Storage.prototype, "getItem")
      .mockImplementation(() => {
        throw new Error("storage unavailable")
      })
    expect(readAppearance()).toBe("light")
    getItem.mockRestore()
  })
})

describe("applyAppearance", () => {
  afterEach(() => {
    document.documentElement.classList.remove("dark")
    document.documentElement.style.colorScheme = ""
  })

  test("dark stays dark whatever the system does", () => {
    for (const systemDark of [false, true]) {
      applyAppearance("dark", systemDark)
      expect(document.documentElement.classList.contains("dark")).toBe(true)
      expect(document.documentElement.style.colorScheme).toBe("dark")
    }
  })

  test("light stays light whatever the system does", () => {
    for (const systemDark of [false, true]) {
      applyAppearance("light", systemDark)
      expect(document.documentElement.classList.contains("dark")).toBe(false)
      expect(document.documentElement.style.colorScheme).toBe("light")
    }
  })

  test("system follows the system's own appearance", () => {
    applyAppearance("system", true)
    expect(document.documentElement.classList.contains("dark")).toBe(true)
    applyAppearance("system", false)
    expect(document.documentElement.classList.contains("dark")).toBe(false)
  })
})

describe("the pre-paint appearance script", () => {
  beforeEach(() => localStorage.removeItem(APPEARANCE_STORAGE_KEY))
  afterEach(() => {
    document.documentElement.classList.remove("dark")
    document.documentElement.style.colorScheme = ""
  })

  test("with no saved choice it paints light", () => {
    window.eval(APPEARANCE_INIT_SCRIPT)
    expect(document.documentElement.classList.contains("dark")).toBe(false)
    expect(document.documentElement.style.colorScheme).toBe("light")
  })

  test("a saved dark is painted before React mounts", () => {
    localStorage.setItem(APPEARANCE_STORAGE_KEY, "dark")
    window.eval(APPEARANCE_INIT_SCRIPT)
    expect(document.documentElement.classList.contains("dark")).toBe(true)
    expect(document.documentElement.style.colorScheme).toBe("dark")
  })

  test("a saved system follows the system's own appearance", () => {
    // jsdom has no matchMedia; the pre-paint script reads the system through it.
    const given = window.matchMedia
    window.matchMedia = (media: string) => ({
      matches: true,
      media,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    })
    localStorage.setItem(APPEARANCE_STORAGE_KEY, "system")
    window.eval(APPEARANCE_INIT_SCRIPT)
    window.matchMedia = given
    expect(document.documentElement.classList.contains("dark")).toBe(true)
    expect(document.documentElement.style.colorScheme).toBe("dark")
  })
})
