import { act, renderHook } from "@testing-library/react"
import { describe, expect, test } from "vitest"
import { testStores, Providers } from "@/test/harness"
import { createPlate, createPlateSetup } from "@/domain/plate/plate"
import type { Plate } from "@/domain/plate/plate"
import type { Stock } from "@/domain/stock/stock"
import { WorkspaceStore } from "@/app/workspace/store"
import { useStockConflict } from "./use-stock-conflict"

const stock: Stock = {
  id: "stock-1",
  name: "Aluminium",
  material: "aluminium",
  width: 100,
  depth: 100,
  height: 10,
  color: "#888888",
}

/** A plate whose stock sits with its minimum corner at `at`. */
const plateAt = (at: [number, number, number]): Plate =>
  createPlate({
    ...createPlateSetup({ stock, stockSource: "assigned" }),
    stockAnchor: at,
  })

/** A store holding `plates`, the first one selected. */
function storeOf(plates: readonly Plate[]): WorkspaceStore {
  const stores = testStores()
  return new WorkspaceStore({
    ...stores.workspace.state,
    plates: [...plates],
    selectedPlateId: plates[0]?.id ?? null,
  })
}

function renderConflict(plate: Plate | null, stores: WorkspaceStore) {
  return renderHook(() => useStockConflict(plate), {
    wrapper: ({ children }) => (
      <Providers stores={{ ...testStores(), workspace: stores }}>
        {children}
      </Providers>
    ),
  })
}

describe("useStockConflict", () => {
  test("no plate, no conflict", () => {
    const { result } = renderConflict(null, storeOf([]))
    expect(result.current).toBeNull()
  })

  test("a plate alone does not conflict", () => {
    const plate = plateAt([0, 0, 0])
    const { result } = renderConflict(plate, storeOf([plate]))
    expect(result.current).toBeNull()
  })

  test("the plate whose stock touches is named, as the Plates list names it", () => {
    const first = plateAt([0, 0, 0])
    const second = plateAt([100, 0, 0])
    const { result } = renderConflict(first, storeOf([first, second]))
    expect(result.current).toBe("Plate 2")
  })

  test("moving the stock apart clears the conflict", () => {
    const first = plateAt([0, 0, 0])
    const second = plateAt([100, 0, 0])
    const stores = storeOf([first, second])
    const { result } = renderConflict(first, stores)
    expect(result.current).toBe("Plate 2")
    act(() => {
      stores.dispatch({
        type: "plate.setup",
        plateId: second.id,
        patch: { stockAnchor: [400, 0, 0] },
      })
    })
    expect(result.current).toBeNull()
  })
})
