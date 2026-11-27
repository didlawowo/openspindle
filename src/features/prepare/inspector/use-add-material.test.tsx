import { act, renderHook } from "@testing-library/react"
import { beforeEach, describe, expect, test, vi } from "vitest"
import { toast } from "sonner"
import { WorkspaceStore } from "@/app/workspace/store"
import { createPlate, createPlateSetup } from "@/domain/plate/plate"
import type { Plate } from "@/domain/plate/plate"
import type { Stock } from "@/domain/stock/stock"
import { Providers, testStores } from "@/test/harness"
import { useAddMaterial } from "./use-add-material"

vi.mock("sonner", () => ({ toast: { error: vi.fn() } }))

const stock: Stock = {
  id: "stock-1",
  name: "Aluminium",
  material: "aluminium",
  width: 60,
  depth: 60,
  height: 10,
  color: "#888888",
}

const plateAt = (at: [number, number, number], piece = stock): Plate =>
  createPlate({
    ...createPlateSetup({ stock: piece, stockSource: "assigned" }),
    stockAnchor: at,
  })

function storeOf(plates: readonly Plate[]): WorkspaceStore {
  const stores = testStores()
  return new WorkspaceStore({
    ...stores.workspace.state,
    plates: [...plates],
    selectedPlateId: plates[0]?.id ?? null,
  })
}

function renderAdd(plate: Plate, stores: WorkspaceStore) {
  return renderHook(() => useAddMaterial(plate), {
    wrapper: ({ children }) => (
      <Providers stores={{ ...testStores(), workspace: stores }}>
        {children}
      </Providers>
    ),
  })
}

describe("useAddMaterial", () => {
  beforeEach(() => vi.mocked(toast.error).mockClear())

  test("adds a second material on the same bed, and selects it", () => {
    const first = plateAt([0, 0, 0])
    const stores = storeOf([first])
    const { result } = renderAdd(first, stores)
    act(() => result.current())
    const plates = stores.state.plates
    expect(plates).toHaveLength(2)
    expect(plates[1].setup.stock).toEqual(stock)
    expect(plates[1].setup.stockAnchor[0]).toBeGreaterThan(
      first.setup.stockAnchor[0] + stock.width
    )
    expect(stores.state.selectedPlateId).toBe(plates[1].id)
  })

  test("keeps only the empty plate: a plate of the user's own is left as it is", () => {
    const first = plateAt([0, 0, 0])
    const stores = storeOf([first])
    const dispatch = vi.spyOn(stores, "dispatch")
    const { result } = renderAdd(first, stores)
    act(() => result.current())
    expect(dispatch).toHaveBeenCalledWith({
      type: "batch",
      commands: [expect.objectContaining({ type: "plates.add" })],
    })
  })

  test("says why when the workspace refuses, and adds nothing", () => {
    const first = plateAt([0, 0, 0])
    const full = [
      first,
      ...Array.from({ length: 99 }, () => plateAt([0, 0, 0])),
    ]
    const stores = storeOf(full)
    const { result } = renderAdd(first, stores)
    act(() => result.current())
    expect(stores.state.plates).toHaveLength(100)
    expect(toast.error).toHaveBeenCalledWith(
      "The material could not be added.",
      { description: "A workspace holds at most 100 plates." }
    )
  })

  test("keeps the empty plate a project starts with, as a plate of its own", () => {
    const first = { ...plateAt([0, 0, 0]), example: true }
    const stores = storeOf([first])
    const { result } = renderAdd(first, stores)
    act(() => result.current())
    expect(stores.state.plates).toHaveLength(2)
    expect(stores.state.plates[0]).toMatchObject({
      id: first.id,
      example: false,
    })
  })

  test("says no place beside the material is free, and adds nothing", () => {
    const first = plateAt([0, 0, 0], { ...stock, width: 150, depth: 150 })
    const stores = storeOf([first])
    const { result } = renderAdd(first, stores)
    act(() => result.current())
    expect(stores.state.plates).toHaveLength(1)
    expect(toast.error).toHaveBeenCalledWith(
      "The material could not be added.",
      {
        description:
          "No free place beside the material on the bed. Move a piece to make room.",
      }
    )
  })
})
