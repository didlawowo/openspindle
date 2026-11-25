import { useState } from "react"
import type { ReactNode } from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render } from "@testing-library/react"
import { I18nextProvider } from "react-i18next"
import { vi } from "vitest"
import { AppStoresProvider } from "@/app/stores"
import { FixtureLibraryStore } from "@/app/fixtures/fixture-library-store"
import { newProject } from "@/app/workspace/defaults"
import { WorkspaceStore } from "@/app/workspace/store"
import { createDefaultStockLibrary } from "@/domain/stock/catalog"
import { i18n } from "@/i18n/renderer"
import { HostProvider } from "@/platform/host-context"
import type { Host, MachineHost, MachineLink } from "@/platform/host"

/** The host as a test sees it: every call succeeds with an empty answer until a test says otherwise. */
export function fakeHost(): Host {
  const machine: MachineHost = {
    snapshot: vi.fn(async () => ({}) as never),
    subscribe: vi.fn(() => () => {}),
    discover: vi.fn(async () => []),
    connect: vi.fn(async () => ({}) as never),
    disconnect: vi.fn(async () => ({}) as never),
    execute: vi.fn(async () => ({}) as never),
    simulateBed: vi.fn(async () => ({}) as never),
    sendConsoleLine: vi.fn(async () => ({}) as never),
    stop: vi.fn(async () => ({}) as never),
    reset: vi.fn(async () => ({}) as never),
    prepare: vi.fn(async () => ({}) as never),
    run: vi.fn(async () => ({}) as never),
    dismissJob: vi.fn(async () => ({}) as never),
    readAnchors: vi.fn(async () => ({}) as never),
    writeAnchors: vi.fn(async () => ({}) as never),
    readConfiguration: vi.fn(async () => ({}) as never),
    writeConfiguration: vi.fn(async () => ({}) as never),
    readHeightMap: vi.fn(async () => ({}) as never),
    readSwitches: vi.fn(async () => ({}) as never),
    watchCamera: vi.fn(() => () => {}),
    watchConsole: vi.fn(() => () => {}),
  }
  const link: MachineLink = {
    current: vi.fn(() => machine),
    subscribe: vi.fn(() => () => {}),
  }
  return {
    machine: link,
    files: {
      open: vi.fn(async () => ({}) as never),
      save: vi.fn(async () => ({}) as never),
      subscribeOpened: vi.fn(() => () => {}),
      pathOf: vi.fn(() => null),
      linkedStatus: vi.fn(async () => ({}) as never),
      readLinked: vi.fn(async () => ({}) as never),
    },
    fusion: {
      snapshot: vi.fn(async () => ({}) as never),
      subscribe: vi.fn(() => () => {}),
      pair: vi.fn(async () => {}),
      dismissPairing: vi.fn(async () => {}),
      list: vi.fn(async () => []),
      read: vi.fn(async () => ({}) as never),
      disconnect: vi.fn(async () => {}),
    },
    storage: {
      read: vi.fn(async () => null),
      write: vi.fn(async () => {}),
      backup: vi.fn(async () => ({}) as never),
      remove: vi.fn(async () => {}),
    },
    models: {
      list: vi.fn(async () => []),
      mesh: vi.fn(async () => null),
      source: vi.fn(async () => null),
      add: vi.fn(async () => ({}) as never),
      rename: vi.fn(async () => ({}) as never),
      remove: vi.fn(async () => {}),
    },
    menu: { subscribe: vi.fn(() => () => {}) },
    window: {
      setEdited: vi.fn(async () => {}),
      close: vi.fn(),
      keepWorkspace: vi.fn(),
      keptWorkspace: vi.fn(async () => null),
    },
    pcb: {
      status: vi.fn(async () => ({}) as never),
      chooseExecutable: vi.fn(async () => ({}) as never),
      setExecutable: vi.fn(async () => ({}) as never),
      generate: vi.fn(async () => ({}) as never),
    },
    diagnostics: {
      status: vi.fn(async () => ({}) as never),
      updateSettings: vi.fn(async () => ({}) as never),
      log: vi.fn(),
      readLog: vi.fn(async () => ""),
      exportLog: vi.fn(async () => ({}) as never),
      sendError: vi.fn(async () => {}),
      watchMainErrors: vi.fn(() => () => {}),
    },
    simulator: {
      status: vi.fn(async () => ({}) as never),
      update: vi.fn(async () => ({}) as never),
    },
    app: { setLanguage: vi.fn(async () => {}) },
  }
}

/** The stores a fresh app starts with: an empty project on the default stock library. */
export function testStores() {
  const workspace = new WorkspaceStore(
    newProject({
      tools: [],
      stocks: createDefaultStockLibrary(),
      defaultToolId: null,
      defaultStockId: null,
    })
  )
  return { workspace, fixtures: new FixtureLibraryStore() }
}

export type RenderOptions = {
  readonly host?: Host
  readonly stores?: ReturnType<typeof testStores>
  readonly queryClient?: QueryClient
}

/** The providers every feature component expects: stores, host, queries, translations. */
export function Providers({
  host = fakeHost(),
  stores = testStores(),
  queryClient: givenClient,
  children,
}: {
  host?: Host
  stores?: ReturnType<typeof testStores>
  queryClient?: QueryClient
  children?: ReactNode
}) {
  const [ownedClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { retry: false },
          mutations: { retry: false },
        },
      })
  )
  const queryClient = givenClient ?? ownedClient
  return (
    <AppStoresProvider value={stores}>
      <HostProvider host={host}>
        <QueryClientProvider client={queryClient}>
          <I18nextProvider i18n={i18n}>{children}</I18nextProvider>
        </QueryClientProvider>
      </HostProvider>
    </AppStoresProvider>
  )
}

/** Renders with the providers every feature component expects: stores, host, queries, translations. */
export function renderWithProviders(
  ui: ReactNode,
  { host = fakeHost(), stores = testStores(), queryClient }: RenderOptions = {}
) {
  const result = render(
    <Providers host={host} stores={stores} queryClient={queryClient}>
      {ui}
    </Providers>
  )
  return { ...result, host, stores }
}
