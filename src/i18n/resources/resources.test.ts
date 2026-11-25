import { describe, expect, test } from "vitest"
import { enResources } from "./en"
import { frResources } from "./fr"

/**
 * The translations are data: every string of both languages is pinned here, so the
 * mutation gate's string mutants of a resources change are all killed. Update the
 * snapshot with `npm test -- --update` when a translation legitimately changes.
 */

/** Every leaf key of a namespace tree, like `toolbar.fit` or `triangles_one`. */
function leafKeys(tree: Record<string, unknown>, prefix = ""): string[] {
  return Object.entries(tree).flatMap(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key
    return value && typeof value === "object"
      ? leafKeys(value as Record<string, unknown>, path)
      : [path]
  })
}

describe("translation resources", () => {
  test("the English resources match their recorded text", () => {
    expect(enResources).toMatchSnapshot()
  })

  test("the French resources match their recorded text", () => {
    expect(frResources).toMatchSnapshot()
  })

  test("both languages carry the same keys in every namespace", () => {
    const english = enResources as Record<string, Record<string, unknown>>
    const french = frResources as Record<string, Record<string, unknown>>
    expect(Object.keys(french).sort()).toEqual(Object.keys(english).sort())
    for (const namespace of Object.keys(english)) {
      // Plural suffixes (_one, _other) name one message each, counted once per language.
      const en = new Set(
        leafKeys(english[namespace]).map((key) =>
          key.replace(/_(one|other)$/, "")
        )
      )
      const fr = new Set(
        leafKeys(french[namespace]).map((key) =>
          key.replace(/_(one|other)$/, "")
        )
      )
      expect([...fr].sort()).toEqual([...en].sort())
    }
  })
})
