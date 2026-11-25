import { screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, test, vi } from "vitest"
import { fakeHost, renderWithProviders } from "@/test/harness"
import { FusionPairingDialog } from "./fusion-pairing-dialog"

const requestId = "2f2a5f6e-9b1c-4d3e-8a7f-0c1d2e3f4a5b"

function snapshot(connected: boolean, request: unknown = null) {
  return { connected, request, discoveryError: null } as never
}

function renderPairing(host = fakeHost()) {
  renderWithProviders(
    <FusionPairingDialog requestId={requestId} returnToFusion={false} />,
    { host }
  )
  return host
}

describe("FusionPairingDialog", () => {
  test("an active request shows the code form", async () => {
    const host = fakeHost()
    vi.mocked(host.fusion.snapshot).mockResolvedValue(
      snapshot(false, { requestId, expiresAt: Date.now() + 60_000 })
    )
    renderPairing(host)
    expect(
      await screen.findByText("Fusion 360 wants to connect")
    ).toBeInTheDocument()
    expect(
      screen.getByText("Enter the six-digit code shown in Fusion 360.")
    ).toBeInTheDocument()
    expect(screen.getByText("Connection code")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Connect" })).toBeDisabled()
  })

  test("a request that is gone says so", async () => {
    const host = fakeHost()
    vi.mocked(host.fusion.snapshot).mockResolvedValue(snapshot(false))
    renderPairing(host)
    expect(
      await screen.findByText(
        "This request has expired or ended. Click Connect to OpenSpindle in Fusion for a new code."
      )
    ).toBeInTheDocument()
  })

  test("typing the code connects, and waits as Connecting…", async () => {
    const host = fakeHost()
    vi.mocked(host.fusion.snapshot).mockResolvedValue(
      snapshot(false, { requestId, expiresAt: Date.now() + 60_000 })
    )
    const pair = deferred<void>()
    vi.mocked(host.fusion.pair).mockReturnValue(pair.promise)
    renderPairing(host)
    const user = userEvent.setup()
    const code = await screen.findByRole("textbox")
    await waitFor(() => expect(code).toBeEnabled())
    await user.type(code, "123456")
    const connect = screen.getByRole("button", { name: "Connect" })
    await waitFor(() => expect(connect).toBeEnabled())
    await user.click(connect)
    await screen.findByText("Connecting…")
    expect(host.fusion.pair).toHaveBeenCalledWith(
      requestId,
      "123456",
      expect.anything()
    )
  })

  test("cancel dismisses the pairing request", async () => {
    const host = fakeHost()
    vi.mocked(host.fusion.snapshot).mockResolvedValue(
      snapshot(false, { requestId, expiresAt: Date.now() + 60_000 })
    )
    renderPairing(host)
    await screen.findByText("Fusion 360 wants to connect")
    await userEvent
      .setup()
      .click(screen.getByRole("button", { name: "Cancel" }))
    await waitFor(() =>
      expect(host.fusion.dismissPairing).toHaveBeenCalledWith(requestId)
    )
  })
})

function deferred<T = never>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((done) => (resolve = done))
  return { promise, resolve }
}
