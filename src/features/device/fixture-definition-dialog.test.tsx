import { screen } from "@testing-library/react"
import { QueryClient } from "@tanstack/react-query"
import { describe, expect, test, vi } from "vitest"
import { fakeHost, renderWithProviders, testStores } from "@/test/harness"
import type { FixtureDefinition } from "@/domain/fixtures/definitions"
import { WORKSPACE_PROFILE } from "@/domain/fixtures/profiles"
import type { ModelRecord } from "@/domain/models/model"
import { modelKeys } from "@/features/models/model-queries"
import { FixtureDefinitionDialog } from "./fixture-definition-dialog"

// The 3D preview needs a GPU; the dialog's text is what this test is about.
vi.mock("./fixture-model-scene", () => ({
  FixtureModelScene: {
    create: () => ({
      dispose: () => {},
      setMesh: () => {},
      show: () => {},
    }),
  },
}))

const modelId = "a".repeat(64)

const vise: ModelRecord = {
  id: modelId,
  name: "Vise",
  source: {
    format: "step",
    fileName: "vise.step",
    bytes: 3_355_443,
    sha256: "b".repeat(64),
  },
  mesh: { bytes: 1200, triangles: 48210 },
  bounds: { min: [0, 0, 0], max: [120, 80, 25] },
  addedAt: 1_700_000_000_000,
}

const modelFixture: FixtureDefinition = {
  id: "def-1",
  name: "Modelled clamp",
  kind: "clamp",
  color: "#888888",
  defaultEnabled: true,
  defaultPosition: [0, 0, 0],
  defaultRotation: [0, 0, 0],
  model: {
    source: { kind: "library", modelId },
    bounds: { min: [0, 0, 0], max: [120, 80, 25] },
    offset: [0, 0, 0],
  },
}

describe("FixtureDefinitionDialog", () => {
  test("a fixture standing on a library model shows that model's details", async () => {
    const host = fakeHost()
    vi.mocked(host.models.list).mockResolvedValue([vise])
    const queryClient = new QueryClient()
    queryClient.setQueryData(modelKeys.library, [vise])
    const stores = testStores()
    stores.fixtures.store.setState((library) => ({
      ...library,
      definitions: [...library.definitions, modelFixture],
    }))
    const bedSetupId =
      stores.fixtures.state.profiles[WORKSPACE_PROFILE].bedSetups[0]?.id ??
      "bed"
    renderWithProviders(
      <FixtureDefinitionDialog
        dialog={{
          kind: "fixture-definition",
          profileId: WORKSPACE_PROFILE,
          bedSetupId,
          definitionId: "def-1",
        }}
        onClose={vi.fn()}
      />,
      { host, stores, queryClient }
    )
    expect(
      await screen.findByRole("combobox", { name: "Model for Modelled clamp" })
    ).toBeInTheDocument()
    expect(
      // The thousands separator follows the test runtime's ICU data.
      await screen.findByText(
        /STEP · 120 × 80 × 25 mm · 48\D?210 triangles · 3\.2 MB/
      )
    ).toBeInTheDocument()
  })
})
