import { describe, expect, test } from "vitest"
import { enResources } from "./en"
import { frResources } from "./fr"

/**
 * The translations are data: every string of both languages is pinned here, so the
 * mutation gate's string mutants of a resources change are all killed. Update the
 * snapshot with `npm test -- --update` when a translation legitimately changes.
 */
describe("translation resources", () => {
  test("the English resources match their recorded text", () => {
    expect(enResources).toMatchSnapshot()
  })

  test("the French resources match their recorded text", () => {
    expect(frResources).toMatchSnapshot()
  })
})
