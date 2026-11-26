import { describe, expect, test } from "vitest"
import { applyViewLock } from "./view-lock"

describe("applyViewLock", () => {
  test("an unlocked view orbits", () => {
    const controls = { enableRotate: false }
    applyViewLock(controls)
    expect(controls.enableRotate).toBe(true)
    applyViewLock(controls, false)
    expect(controls.enableRotate).toBe(true)
  })

  test("a locked view holds its angle", () => {
    const controls = { enableRotate: true }
    applyViewLock(controls, true)
    expect(controls.enableRotate).toBe(false)
  })
})
