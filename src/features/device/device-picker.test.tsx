import { QueryClient } from "@tanstack/react-query"
import { screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, test, vi } from "vitest"
import { disconnectedSnapshot } from "@/machine/contract"
import type { MachineSnapshot, NetworkDevice } from "@/machine/contract"
import { machineKeys } from "@/platform/machine"
import { fakeHost, renderWithProviders } from "@/test/harness"
import { DevicePicker } from "./device-picker"

const simulator: NetworkDevice = {
  name: "Z1 Simulator",
  host: "127.0.0.1",
  port: 2223,
  busy: false,
}

const other: NetworkDevice = {
  name: "Z1",
  host: "192.168.1.42",
  port: 2222,
  busy: false,
}

/** The picker over the devices found, and the snapshot a mounted app would hold. */
function renderPicker(devices: readonly NetworkDevice[], connected: boolean) {
  const host = fakeHost()
  const machine = host.machine.current()
  machine.discover = vi.fn(async () => [...devices])
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  if (connected) {
    const snapshot: MachineSnapshot = {
      ...disconnectedSnapshot(1),
      connection: {
        id: "device-1",
        status: "connected",
        device: {
          name: simulator.name,
          host: simulator.host,
          port: simulator.port,
          model: "Z1",
        },
        error: null,
        restarting: false,
        restartNeeded: false,
      },
    }
    queryClient.setQueryData(machineKeys.snapshot, snapshot)
  }
  renderWithProviders(<DevicePicker close={() => {}} />, { host, queryClient })
}

/** The card a device is found on, by the address its row shows. */
const cardOf = (address: string) =>
  screen.getByText(address).closest<HTMLElement>("[data-slot=card]")!

describe("the device picker", () => {
  test("the connected device shows once, with Disconnect, not on the network list", async () => {
    renderPicker([simulator, other], true)
    // The network list is what the search fills: it must not list the connected device.
    await waitFor(() =>
      expect(screen.getByText("192.168.1.42:2222")).toBeInTheDocument()
    )
    expect(screen.queryByText("127.0.0.1:2223")).not.toBeInTheDocument()
    expect(screen.getAllByText("Z1 Simulator")).toHaveLength(1)
    expect(
      screen.getByRole("button", { name: "Disconnect" })
    ).toBeInTheDocument()
  })

  test("without a connection every device found is offered", async () => {
    renderPicker([simulator, other], false)
    await waitFor(() =>
      expect(screen.getByText("127.0.0.1:2223")).toBeInTheDocument()
    )
    expect(screen.getByText("192.168.1.42:2222")).toBeInTheDocument()
    for (const address of ["127.0.0.1:2223", "192.168.1.42:2222"])
      expect(
        within(cardOf(address)).getByRole("button", { name: "Connect" })
      ).toBeEnabled()
    expect(
      screen.queryByRole("button", { name: "Disconnect" })
    ).not.toBeInTheDocument()
  })

  test("a device in use is listed with why, and stays unconnectable", async () => {
    renderPicker([{ ...other, busy: true }], false)
    await waitFor(() =>
      expect(screen.getByText("192.168.1.42:2222 · In use")).toBeInTheDocument()
    )
    expect(
      within(cardOf("192.168.1.42:2222 · In use")).getByRole("button", {
        name: "Connect",
      })
    ).toBeDisabled()
  })

  test("a device being connected to says so until it answers", async () => {
    const host = fakeHost()
    const machine = host.machine.current()
    machine.discover = vi.fn(async () => [{ ...other }])
    machine.connect = vi.fn(() => new Promise<never>(() => {}))
    renderWithProviders(<DevicePicker close={() => {}} />, { host })
    await waitFor(() =>
      expect(screen.getByText("192.168.1.42:2222")).toBeInTheDocument()
    )
    await userEvent.click(
      within(cardOf("192.168.1.42:2222")).getByRole("button", {
        name: "Connect",
      })
    )
    await waitFor(() =>
      expect(
        within(cardOf("192.168.1.42:2222")).getByRole("button", {
          name: "Connecting…",
        })
      ).toBeDisabled()
    )
  })
})
