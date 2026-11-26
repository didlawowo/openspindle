import { describe, expect, test } from "vitest"
import { createPlate, createPlateSetup } from "@/domain/plate/plate"
import { i18n } from "@/i18n/renderer"
import type { Stock } from "@/domain/stock/stock"
import { platesClear } from "./run-checklist"
import type { RunContext } from "./run-checklist"

const t = i18n.getFixedT("en", "job")

const stock: Stock = {
  id: "stock-1",
  name: "Aluminium",
  material: "aluminium",
  width: 100,
  depth: 100,
  height: 10,
  color: "#888888",
}

const plate = createPlate(createPlateSetup({ stock, stockSource: "assigned" }))

/** The row reads only the plate and the conflict; the rest of the checklist's context is noise. */
const context = (fields: Pick<RunContext, "plate" | "stockConflict">) =>
  fields as RunContext

describe("the plates-clear check", () => {
  test("waits for a plate", () => {
    expect(
      platesClear.show(context({ plate: null, stockConflict: null }), t)
    ).toEqual({ status: "pending", reason: "Waits for a plate." })
  })

  test("passes when no plate's stock touches the plate's own", () => {
    expect(
      platesClear.show(context({ plate, stockConflict: null }), t)
    ).toEqual({ status: "pass" })
  })

  test("fails, naming the plate it touches, with Prepare as the way there", () => {
    const result = platesClear.show(
      context({ plate, stockConflict: "Plate 2" }),
      t
    )
    expect(result.status).toBe("fail")
    expect(result.reason).toBe(
      "Its stock touches Plate 2's; separate them on the bed."
    )
    expect(result.fix).toMatchObject({ kind: "prepare" })
  })
})
