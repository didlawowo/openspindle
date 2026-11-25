import { fireEvent, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, test, vi } from "vitest"
import { fakeHost, renderWithProviders, testStores } from "@/test/harness"
import type { FixtureDefinition } from "@/domain/fixtures/definitions"
import type { ModelRecord } from "@/domain/models/model"
import { ModelsDialog } from "./models-dialog"

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

/** A fixture definition standing on the library model, to make it used. */
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
    bounds: { min: [0, 0, 0], max: [10, 10, 10] },
    offset: [0, 0, 0],
  },
}

function withUsedModel(stores: ReturnType<typeof testStores>) {
  stores.fixtures.store.setState((library) => ({
    ...library,
    definitions: [...library.definitions, modelFixture],
  }))
}

function renderDialog(
  options: {
    models?: ModelRecord[]
    error?: Error
    list?: () => Promise<ModelRecord[]>
    stores?: ReturnType<typeof testStores>
  } = {}
) {
  const host = fakeHost()
  if (options.list) vi.mocked(host.models.list).mockImplementation(options.list)
  else if (options.error)
    vi.mocked(host.models.list).mockRejectedValue(options.error)
  else vi.mocked(host.models.list).mockResolvedValue(options.models ?? [])
  const stores = options.stores ?? testStores()
  const view = renderWithProviders(<ModelsDialog onClose={vi.fn()} />, {
    host,
    stores,
  })
  return { host, stores, container: view.container }
}

describe("ModelsDialog", () => {
  test("an empty library says how to fill it", async () => {
    renderDialog()
    expect(await screen.findByText("No models yet")).toBeInTheDocument()
    expect(
      screen.getByText(
        "Add STEP or GLB files of your fixtures, such as vises and clamps, to place them on the bed."
      )
    ).toBeInTheDocument()
    expect(screen.getByText("0 models")).toBeInTheDocument()
  })

  test("a library that cannot be read shows its error", async () => {
    renderDialog({ error: new Error("the disk is gone") })
    expect(await screen.findByText("the disk is gone")).toBeInTheDocument()
  })

  test("a model shows its name, its details and that nobody uses it", async () => {
    renderDialog({ models: [vise] })
    expect(
      await screen.findByRole("heading", { name: "Models" })
    ).toBeInTheDocument()
    expect(
      // The dialog renders in a portal, outside the render container.
      document.querySelector('div[aria-label="Models"]')
    ).not.toBeNull()
    expect(
      screen.getByText(
        "STEP files are tessellated on this computer and kept with their mesh. Fixtures place models on the bed."
      )
    ).toBeInTheDocument()
    expect(await screen.findByText("1 model")).toBeInTheDocument()
    expect(
      // The thousands separator follows the test runtime's ICU data.
      screen.getByText(/STEP · 120 × 80 × 25 mm · 48\D?210 triangles · 3\.2 MB/)
    ).toBeInTheDocument()
    expect(screen.getByText("Not used")).toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: "Rename Vise" })
    ).toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: "Delete Vise" })
    ).toBeInTheDocument()
  })

  test("dimensions keep one decimal under 10 mm and round above", async () => {
    renderDialog({
      models: [
        {
          ...vise,
          bounds: { min: [10, 0, 0], max: [130.4, 8, 2.5] },
        },
      ],
    })
    expect(
      // The decimal and thousands separators follow the runtime's locale.
      await screen.findByText(/STEP · 120 × 8 × 2.5 mm · 48\D?210 triangles/)
    ).toBeInTheDocument()
  })

  test("a model a fixture stands on names its users", async () => {
    const stores = testStores()
    withUsedModel(stores)
    renderDialog({ models: [vise], stores })
    expect(
      await screen.findByText("Used by 1 fixture definition")
    ).toBeInTheDocument()
  })

  test("a model from a project without a source reads From a project", async () => {
    renderDialog({
      models: [{ ...vise, source: null, mesh: { bytes: 2048, triangles: 8 } }],
    })
    expect(
      await screen.findByText(
        "From a project · 120 × 80 × 25 mm · 8 triangles · 2 KB"
      )
    ).toBeInTheDocument()
  })

  test("renaming a model saves the new name", async () => {
    const { host } = renderDialog({ models: [vise] })
    vi.mocked(host.models.rename).mockResolvedValue({
      ...vise,
      name: "Heavy vise",
    })
    const user = userEvent.setup()
    await user.click(await screen.findByRole("button", { name: "Rename Vise" }))
    const input = await screen.findByLabelText("Name of Vise")
    await user.clear(input)
    await user.type(input, "Heavy vise")
    await user.tab()
    await waitFor(() =>
      expect(host.models.rename).toHaveBeenCalledWith(modelId, "Heavy vise")
    )
  })

  test("deleting an unused model asks plainly and removes it", async () => {
    const { host } = renderDialog({ models: [vise] })
    const user = userEvent.setup()
    await user.click(await screen.findByRole("button", { name: "Delete Vise" }))
    const dialog = await screen.findByRole("alertdialog")
    expect(within(dialog).getByText("Delete Vise?")).toBeInTheDocument()
    expect(
      within(dialog).getByText("It is not used by any fixture.")
    ).toBeInTheDocument()
    await user.click(within(dialog).getByRole("button", { name: "Delete" }))
    await waitFor(() =>
      expect(host.models.remove).toHaveBeenCalledWith(modelId)
    )
  })

  test("deleting a used model warns what its fixtures will show", async () => {
    const stores = testStores()
    withUsedModel(stores)
    const { host } = renderDialog({ models: [vise], stores })
    const user = userEvent.setup()
    await user.click(await screen.findByRole("button", { name: "Delete Vise" }))
    const dialog = await screen.findByRole("alertdialog")
    expect(
      within(dialog).getByText(
        "Used by 1 fixture definition. Their fixtures will show a box of its size until they get another model."
      )
    ).toBeInTheDocument()
    await user.click(within(dialog).getByRole("button", { name: "Cancel" }))
    await waitFor(() => expect(host.models.remove).not.toHaveBeenCalled())
  })

  test("a file the library refuses is listed under its name", async () => {
    renderDialog({ models: [] })
    const input = await screen.findByLabelText("Model files")
    fireEvent.change(input, {
      target: { files: [new File(["hello"], "notes.txt")] },
    })
    expect(
      await screen.findByText("1 file could not be added")
    ).toBeInTheDocument()
    expect(
      screen.getByText(
        "notes.txt: Choose a STEP (.step, .stp) or binary glTF (.glb) file."
      )
    ).toBeInTheDocument()
  })

  test("the add button waits while an import runs", async () => {
    let finish!: (models: ModelRecord[]) => void
    renderDialog({
      list: () => new Promise<ModelRecord[]>((done) => (finish = done)),
    })
    const input = await screen.findByLabelText("Model files")
    fireEvent.change(input, {
      target: { files: [new File(["x"], "part.glb")] },
    })
    const add = await screen.findByRole("button", { name: "Add models…" })
    await waitFor(() => expect(add).toBeDisabled())
    finish([])
    await waitFor(() => expect(add).toBeEnabled())
  })
})
