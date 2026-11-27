import type { BedPicture } from "@/domain/fixtures/bed-photo"
import { Providers, renderWithProviders } from "@/test/harness"
import { describe, expect, test, vi } from "vitest"
import { BedViewer } from "./bed-viewer"

/** The scene's calls, as the viewer makes them: no WebGL in a test, so the scene is a stub. */
const calls = {
  present: vi.fn(),
  setPlates: vi.fn(),
  setView: vi.fn(),
  setZoom: vi.fn(),
  setStyle: vi.fn(),
  setSharedBed: vi.fn(),
  setBedPicture: vi.fn(),
  arrange: vi.fn(),
  reveal: vi.fn(),
  dispose: vi.fn(),
}

vi.mock("@/components/workspace/viewer/bed-scene", () => ({
  BedScene: {
    create: () => calls,
  },
}))

const picture: BedPicture = {
  area: { min: [0, 0], max: [1, 1] },
  columns: 1,
  rows: 1,
  pixels: new Uint8ClampedArray(4),
}

function renderViewer(sharedBed?: boolean, bedPicture?: BedPicture | null) {
  return renderWithProviders(
    <BedViewer
      plates={[]}
      selectedPlateId={null}
      onSelectPlate={() => {}}
      showRapids={false}
      showStock
      view="perspective"
      resetKey={0}
      zoom={1}
      sharedBed={sharedBed}
      bedPicture={bedPicture}
    />
  )
}

describe("the bed viewer", () => {
  test("draws each plate on its own bed unless told otherwise", () => {
    calls.setSharedBed.mockClear()
    renderViewer()
    expect(calls.setSharedBed).toHaveBeenCalledWith(false)
  })

  test("passes the one-bed view on to the scene", () => {
    calls.setSharedBed.mockClear()
    renderViewer(true)
    expect(calls.setSharedBed).toHaveBeenCalledWith(true)
  })

  test("switching the one-bed view tells the scene again", () => {
    calls.setSharedBed.mockClear()
    const { rerender } = renderViewer(false)
    expect(calls.setSharedBed).toHaveBeenLastCalledWith(false)
    rerender(
      <Providers>
        <BedViewer
          plates={[]}
          selectedPlateId={null}
          onSelectPlate={() => {}}
          showRapids={false}
          showStock
          view="perspective"
          resetKey={0}
          zoom={1}
          sharedBed
        />
      </Providers>
    )
    expect(calls.setSharedBed).toHaveBeenLastCalledWith(true)
  })

  test("closes the scene it made", () => {
    calls.dispose.mockClear()
    const { unmount } = renderViewer()
    unmount()
    expect(calls.dispose).toHaveBeenCalled()
  })

  test("draws no bed photo by default, and passes the one it is given on to the scene", () => {
    calls.setBedPicture.mockClear()
    renderViewer()
    expect(calls.setBedPicture).toHaveBeenLastCalledWith(null)
    calls.setBedPicture.mockClear()
    renderViewer(false, picture)
    expect(calls.setBedPicture).toHaveBeenLastCalledWith(picture)
  })
})
