import "@testing-library/jest-dom/vitest"
import { cleanup } from "@testing-library/react"
import { afterEach, beforeEach } from "vitest"
import { i18n } from "@/i18n/renderer"

// jsdom lacks these; input-otp, base-ui and the 3D viewer stages call them.
document.elementFromPoint = () => null
Element.prototype.getAnimations = () => []
class StubResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver = StubResizeObserver

// Files share one i18n instance; start every test on English.
beforeEach(() => i18n.changeLanguage("en"))

afterEach(() => cleanup())
