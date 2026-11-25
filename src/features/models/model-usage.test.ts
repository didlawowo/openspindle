import { describe, expect, test } from "vitest"
import { i18n } from "@/i18n/renderer"
import { usageText } from "./model-usage"

const t = i18n.getFixedT("en", "models")

describe("usageText", () => {
  test("a model nobody uses reads Not used", () => {
    expect(usageText(t, undefined)).toBe("Not used")
    expect(usageText(t, { definitions: 0, plates: 0 })).toBe("Not used")
  })

  test("both users are named with their counts", () => {
    expect(usageText(t, { definitions: 2, plates: 3 })).toBe(
      "Used by 2 fixture definitions and 3 plates"
    )
  })

  test("one user of each kind stays singular", () => {
    expect(usageText(t, { definitions: 1, plates: 0 })).toBe(
      "Used by 1 fixture definition"
    )
    expect(usageText(t, { definitions: 0, plates: 1 })).toBe("Used by 1 plate")
  })
})
