import { renderHook } from "@testing-library/react"
import { describe, expect, test, vi } from "vitest"
import { Providers, fakeHost, testStores } from "@/test/harness"
import { createDefaultStockLibrary } from "@/domain/stock/catalog"
import { newProject } from "@/app/workspace/defaults"
import { createPlate, createPlateSetup } from "@/domain/plate/plate"
import { createOperation } from "@/domain/operations/operation"
import { useFusionUpdate } from "./use-fusion-update"

function fusionPlate() {
  const operation = createOperation("Cut", {
    kind: "file",
    nc: "G1 X0\n",
    park: true,
    origin: {
      kind: "fusion",
      documentId: "doc-1",
      documentName: "Bracket",
      programId: 7,
      programName: "Program A",
      part: null,
      resolutions: {},
    },
  })
  const plate = {
    ...createPlate(
      createPlateSetup({ stock: null, stockSource: "unspecified" })
    ),
    operations: [operation],
  }
  return { plate, operation }
}

function renderUpdate(host = fakeHost()) {
  const stores = testStores()
  const { result } = renderHook(() => useFusionUpdate(), {
    wrapper: ({ children }) => (
      <Providers host={host} stores={stores}>
        {children}
      </Providers>
    ),
  })
  return { result, host, stores }
}

describe("useFusionUpdate", () => {
  test("an operation that is not there did not come from Fusion 360", async () => {
    const { result } = renderUpdate()
    await expect(
      result.current.mutateAsync({ plateId: "nope", operationId: "nope" })
    ).rejects.toThrow("This operation did not come from Fusion 360.")
  })

  test("updating while Fusion is disconnected says to connect first", async () => {
    const host = fakeHost()
    vi.mocked(host.fusion.snapshot).mockResolvedValue({
      connected: false,
    } as never)
    const { result, stores } = renderUpdate(host)
    const { plate, operation } = fusionPlate()
    stores.workspace.dispatch({
      type: "workspace.replace",
      state: {
        ...newProject({
          tools: [],
          stocks: createDefaultStockLibrary(),
          defaultToolId: null,
          defaultStockId: null,
        }),
        plates: [plate],
        selectedPlateId: plate.id,
      },
    })
    await expect(
      result.current.mutateAsync({
        plateId: plate.id,
        operationId: operation.id,
      })
    ).rejects.toThrow(
      "Connect Fusion 360 first: in Fusion, click OpenSpindle › Connect to OpenSpindle."
    )
  })
})
