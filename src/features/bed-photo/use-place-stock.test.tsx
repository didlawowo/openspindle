import { act, renderHook } from "@testing-library/react"
import { beforeEach, describe, expect, test, vi } from "vitest"
import { toast } from "sonner"
import { WorkspaceStore } from "@/app/workspace/store"
import { createPlate, createPlateSetup } from "@/domain/plate/plate"
import { Providers, testStores } from "@/test/harness"
import { setBedPicture } from "./bed-picture"
import { usePlaceStock } from "./use-place-stock"
import type { BedObject, BedView } from "@/domain/fixtures/bed-objects"
import type { BedPicture } from "@/domain/fixtures/bed-photo"
import type { MachineCamera } from "@/domain/fixtures/fixture-kit"
import type { Plate } from "@/domain/plate/plate"
import type { Stock } from "@/domain/stock/stock"
import type { FoundOnBed } from "./bed-picture"

vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}))

const stock60x40: Stock = {
  id: "stock-60x40",
  name: "Aluminium",
  material: "aluminium",
  width: 60,
  depth: 40,
  height: 10,
  color: "#888888",
}

const stock20x20: Stock = {
  ...stock60x40,
  id: "stock-20x20",
  width: 20,
  depth: 20,
}

const area = { min: [0, 0], max: [100, 100] } as const
const columns = 100
const rows = 100
const cell = 1

const mosaic = {
  columns,
  rows,
  photo: new Int16Array(columns * rows).fill(-1),
  pixel: new Float32Array(columns * rows * 2),
}

const picture: BedPicture = {
  area,
  columns,
  rows,
  pixels: new Uint8ClampedArray(columns * rows * 4),
}

const cells: number[] = []
for (let column = 20; column < 80; column += 1) {
  for (let row = 50; row < 90; row += 1) {
    cells.push(row * columns + column)
  }
}

const stockObject: BedObject = {
  kind: "stock",
  cells: Uint32Array.from(cells),
}

const camera: MachineCamera = {
  position: [-60, 0, 90],
  target: [50, 0, 0],
  fov: 45,
  aspect: 4 / 3,
}

const view: BedView = { mosaic, area, cell }

const found: FoundOnBed = {
  camera,
  photos: [],
  view,
  objects: [stockObject],
}

function storeOf(plates: readonly Plate[]): WorkspaceStore {
  const stores = testStores()
  return new WorkspaceStore({
    ...stores.workspace.state,
    plates: [...plates],
    selectedPlateId: plates[0]?.id ?? null,
  })
}

function renderPlace(stores: WorkspaceStore) {
  return renderHook(() => usePlaceStock(), {
    wrapper: ({ children }) => (
      <Providers stores={{ ...testStores(), workspace: stores }}>
        {children}
      </Providers>
    ),
  })
}

function plateWithStock(stock: Stock, at: [number, number, number]): Plate {
  return createPlate({
    ...createPlateSetup({ stock, stockSource: "assigned" }),
    stockAnchor: at,
  })
}

function emptyPlate(at: [number, number, number]): Plate {
  return createPlate({
    ...createPlateSetup({}),
    stockAnchor: at,
  })
}

describe("usePlaceStock", () => {
  beforeEach(() => {
    vi.mocked(toast.error).mockClear()
    vi.mocked(toast.success).mockClear()
    act(() => setBedPicture(picture, found))
  })

  test("refuses to place stock when the plate has no material", () => {
    const plate = emptyPlate([0, 0, 0])
    const stores = storeOf([plate])
    const { result } = renderPlace(stores)

    expect(result.current.reason).not.toBeNull()

    act(() => result.current.run())

    expect(stores.state.plates[0].setup.stockAnchor).toEqual([0, 0, 0])
    expect(toast.error).not.toHaveBeenCalled()
    expect(toast.success).not.toHaveBeenCalled()
  })

  test("places the stock where the bed photo shows a piece of its size", () => {
    const plate = plateWithStock(stock60x40, [0, 0, 0])
    const stores = storeOf([plate])
    const { result } = renderPlace(stores)

    expect(result.current.reason).toBeNull()

    act(() => result.current.run())

    const anchor = stores.state.plates[0].setup.stockAnchor
    expect(Math.abs(anchor[0] - 20)).toBeLessThanOrEqual(1.5)
    expect(Math.abs(anchor[1] - 10)).toBeLessThanOrEqual(1.5)
    expect(anchor[2]).toBe(0)
    expect(toast.success).toHaveBeenCalledTimes(1)
    expect(toast.error).not.toHaveBeenCalled()
  })

  test("says the piece was not found when the stock size does not match the photo", () => {
    const plate = plateWithStock(stock20x20, [0, 0, 0])
    const stores = storeOf([plate])
    const { result } = renderPlace(stores)

    expect(result.current.reason).toBeNull()

    act(() => result.current.run())

    expect(stores.state.plates[0].setup.stockAnchor).toEqual([0, 0, 0])
    expect(toast.error).toHaveBeenCalledTimes(1)
    expect(toast.success).not.toHaveBeenCalled()
  })
})
