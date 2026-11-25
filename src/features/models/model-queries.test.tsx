import { renderHook, waitFor } from "@testing-library/react"
import { QueryClient } from "@tanstack/react-query"
import { describe, expect, test, vi } from "vitest"
import { Providers, fakeHost } from "@/test/harness"
import type { ModelRecord } from "@/domain/models/model"
import { modelKeys, useImportModels, useModelLibrary } from "./model-queries"

/** The hex SHA-256 a test file's contents hash to, as the importer computes it. */
async function sha256Of(text: string) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(text)
  )
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("")
}

const record = {
  id: "m1",
  name: "Vise",
  fileName: "vise.step",
  bytes: 10,
  addedAt: "2026-01-01T00:00:00Z",
} as unknown as ModelRecord

describe("useModelLibrary", () => {
  test("reads the library through the host", async () => {
    const host = fakeHost()
    vi.mocked(host.models.list).mockResolvedValue([record])
    const { result } = renderHook(() => useModelLibrary(), {
      wrapper: ({ children }) => <Providers host={host}>{children}</Providers>,
    })
    await waitFor(() => expect(result.current.data).toEqual([record]))
    expect(host.models.list).toHaveBeenCalled()
  })
})

describe("useImportModels", () => {
  test("a file the importer refuses is reported with its name and message", async () => {
    const host = fakeHost()
    const { result } = renderHook(() => useImportModels(), {
      wrapper: ({ children }) => <Providers host={host}>{children}</Providers>,
    })
    const outcome = await result.current.mutateAsync([
      new File(["not a step file"], "part.step"),
    ])
    expect(outcome.imported).toEqual([])
    expect(outcome.failures).toHaveLength(1)
    const [failure] = outcome.failures
    expect(failure.file).toBe("part.step")
    expect(failure.message).not.toBeNull()
    expect(failure.message!.trim()).not.toBe("")
  })

  test("a failure thrown as a plain value carries no message", async () => {
    const host = fakeHost()
    vi.mocked(host.models.list).mockRejectedValue("boom")
    const { result } = renderHook(() => useImportModels(), {
      wrapper: ({ children }) => <Providers host={host}>{children}</Providers>,
    })
    const outcome = await result.current.mutateAsync([
      new File(["x"], "part.step"),
    ])
    expect(outcome.failures).toEqual([{ file: "part.step", message: null }])
  })

  test("a failure whose error says nothing carries no message", async () => {
    const host = fakeHost()
    vi.mocked(host.models.list).mockRejectedValue(new Error("   "))
    const { result } = renderHook(() => useImportModels(), {
      wrapper: ({ children }) => <Providers host={host}>{children}</Providers>,
    })
    const outcome = await result.current.mutateAsync([
      new File(["x"], "part.step"),
    ])
    expect(outcome.failures).toEqual([{ file: "part.step", message: null }])
  })

  test("the import checks new files against the cached library", async () => {
    const host = fakeHost()
    const known = { ...record, source: { sha256: await sha256Of("x") } }
    const queryClient = new QueryClient()
    queryClient.setQueryData(modelKeys.library, [known])
    const { result } = renderHook(() => useImportModels(), {
      wrapper: ({ children }) => (
        <Providers host={host} queryClient={queryClient}>
          {children}
        </Providers>
      ),
    })
    const outcome = await result.current.mutateAsync([
      new File(["x"], "vise.step"),
    ])
    // The file's hash matches the cached record, and the import returns it: the
    // duplicate check read the shared library query, not a fresh fetch.
    expect(outcome.imported).toEqual([known])
    expect(outcome.failures).toEqual([])
    expect(host.models.list).not.toHaveBeenCalled()
    expect(result.current.progress).toBeNull()
  })
})
