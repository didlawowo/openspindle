import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { vi, describe, expect, test } from "vitest"
import { renderWithProviders } from "@/test/harness"
import { useImportModels } from "./model-queries"
import type { ImportStep } from "./import-model"
import { ModelsDialog } from "./models-dialog"

vi.mock("./model-queries", () => ({
  modelKeys: { library: ["models", "library"], import: ["models", "import"] },
  useModelLibrary: () => ({ data: [], error: null }),
  useImportModels: vi.fn(),
  useRenameModel: () => ({ mutate: vi.fn() }),
  useRemoveModel: () => ({ mutate: vi.fn() }),
}))

function showProgress(step: ImportStep) {
  vi.mocked(useImportModels).mockReturnValue({
    progress: { fileName: "part.step", step },
    isPending: true,
    data: undefined,
    mutate: vi.fn(),
    cancel: vi.fn(),
  } as never)
  renderWithProviders(<ModelsDialog onClose={vi.fn()} />)
}

describe("the running import", () => {
  test("reading a file says Reading", () => {
    showProgress("reading")
    expect(screen.getByText("Reading part.step…")).toBeInTheDocument()
  })

  test("tessellating a file says Tessellating", () => {
    showProgress("tessellating")
    expect(screen.getByText("Tessellating part.step…")).toBeInTheDocument()
  })

  test("saving a file says Saving", () => {
    showProgress("saving")
    expect(screen.getByText("Saving part.step…")).toBeInTheDocument()
  })

  test("the running import can be cancelled", async () => {
    const cancel = vi.fn()
    vi.mocked(useImportModels).mockReturnValue({
      progress: { fileName: "part.step", step: "reading" },
      isPending: true,
      data: undefined,
      mutate: vi.fn(),
      cancel,
    } as never)
    renderWithProviders(<ModelsDialog onClose={vi.fn()} />)
    await userEvent
      .setup()
      .click(screen.getByRole("button", { name: "Cancel" }))
    expect(cancel).toHaveBeenCalledTimes(1)
  })

  test("failed files are listed under their count", () => {
    vi.mocked(useImportModels).mockReturnValue({
      progress: null,
      isPending: false,
      data: {
        imported: [],
        failures: [
          { file: "a.step", message: "it broke" },
          { file: "b.glb", message: null },
        ],
      },
      mutate: vi.fn(),
      cancel: vi.fn(),
    } as never)
    renderWithProviders(<ModelsDialog onClose={vi.fn()} />)
    expect(screen.getByText("2 files could not be added")).toBeInTheDocument()
    expect(screen.getByText("a.step: it broke")).toBeInTheDocument()
    expect(screen.getByText("b.glb: it could not be read.")).toBeInTheDocument()
  })

  test("two failures of one file keep distinct list keys", () => {
    const warned = vi.spyOn(console, "error").mockImplementation(() => {})
    vi.mocked(useImportModels).mockReturnValue({
      progress: null,
      isPending: false,
      data: {
        imported: [],
        failures: [
          { file: "a.step", message: "first" },
          { file: "a.step", message: "second" },
        ],
      },
      mutate: vi.fn(),
      cancel: vi.fn(),
    } as never)
    renderWithProviders(<ModelsDialog onClose={vi.fn()} />)
    expect(screen.getByText("a.step: first")).toBeInTheDocument()
    expect(screen.getByText("a.step: second")).toBeInTheDocument()
    expect(warned).not.toHaveBeenCalled()
    warned.mockRestore()
  })
})
