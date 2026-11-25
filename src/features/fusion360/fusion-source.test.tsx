import { screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, test, vi } from "vitest"
import { fakeHost, renderWithProviders } from "@/test/harness"
import { FusionSource } from "./fusion-source"

function deferred<T = never>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((done) => (resolve = done))
  return { promise, resolve }
}

const connected = {
  connected: true,
  request: null,
  discoveryError: null,
}

const program = {
  id: "9f1c0b6e-2b7a-4a53-9d1c-64f0e2b7a8c1",
  name: "Program A",
  documentName: "Bracket",
}
const programList = [program]

function renderSource(host = fakeHost()) {
  renderWithProviders(<FusionSource onDone={vi.fn()} />, { host })
  return host
}

describe("FusionSource", () => {
  test("while Fusion is not connected it explains how to set it up", async () => {
    const host = fakeHost()
    vi.mocked(host.fusion.snapshot).mockResolvedValue({
      connected: false,
      request: null,
      discoveryError: null,
    })
    renderSource(host)
    expect(
      await screen.findByText("Set up connection with Fusion 360")
    ).toBeInTheDocument()
    expect(
      screen.getByText(
        "In Autodesk Fusion, click OpenSpindle › Connect to OpenSpindle. A dialog will appear here to enter the six-digit code."
      )
    ).toBeInTheDocument()
    const link = screen.getByRole("button", { name: "Learn More" })
    expect(link).toHaveAttribute(
      "href",
      "https://github.com/openspindle/openspindle/blob/main/docs/fusion360.md"
    )
  })

  test("an empty connected library reads No NC programs once read", async () => {
    const host = fakeHost()
    const list = deferred<never[]>()
    vi.mocked(host.fusion.snapshot).mockResolvedValue(connected)
    vi.mocked(host.fusion.list).mockReturnValue(list.promise)
    renderSource(host)
    await screen.findByText("Reading NC programs…")
    expect(
      screen.getByText(
        "Open a Fusion document and configure an NC program in Manufacture, then refresh."
      )
    ).toBeInTheDocument()
    list.resolve([])
    await screen.findByText("No NC programs")
  })

  test("a connected library offers its programs, a refresh and an import", async () => {
    const host = fakeHost()
    vi.mocked(host.fusion.snapshot).mockResolvedValue(connected)
    vi.mocked(host.fusion.list).mockResolvedValue(programList)
    renderSource(host)
    await screen.findByText(
      "Import posts the program with its Fusion post processor."
    )
    expect(screen.getByText("NC program")).toBeInTheDocument()
    expect(
      screen.getByRole("combobox", { name: "NC program" })
    ).toHaveTextContent("Choose a program")
    expect(screen.getByRole("button", { name: "Import" })).toBeDisabled()
    await userEvent
      .setup()
      .click(screen.getByRole("button", { name: "Disconnect" }))
    await waitFor(() => expect(host.fusion.disconnect).toHaveBeenCalled())
  })

  test("choosing a program enables the import, which posts first", async () => {
    const host = fakeHost()
    vi.mocked(host.fusion.snapshot).mockResolvedValue(connected)
    vi.mocked(host.fusion.list).mockResolvedValue(programList)
    renderSource(host)
    const user = userEvent.setup()
    await user.click(
      await screen.findByRole("combobox", { name: "NC program" })
    )
    await user.click(await screen.findByText("Bracket · Program A"))
    const importButton = await screen.findByRole("button", { name: "Import" })
    await waitFor(() => expect(importButton).toBeEnabled())
    const read = deferred()
    vi.mocked(host.fusion.read).mockReturnValue(read.promise)
    await user.click(importButton)
    await screen.findByText("Posting…")
    expect(host.fusion.read).toHaveBeenCalledWith(program.id, expect.anything())
  })

  test("refresh reads the programs again", async () => {
    const host = fakeHost()
    vi.mocked(host.fusion.snapshot).mockResolvedValue(connected)
    vi.mocked(host.fusion.list).mockResolvedValue(programList)
    renderSource(host)
    await screen.findByText(
      "Import posts the program with its Fusion post processor."
    )
    const refetch = deferred<typeof programList>()
    vi.mocked(host.fusion.list).mockReturnValue(refetch.promise)
    await userEvent
      .setup()
      .click(screen.getByRole("button", { name: "Refresh" }))
    await screen.findByText("Refreshing…")
    refetch.resolve(programList)
    await screen.findByRole("button", { name: "Refresh" })
  })
})
