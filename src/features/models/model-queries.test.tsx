import { renderHook, waitFor } from "@testing-library/react"
import { describe, expect, test, vi } from "vitest"
import { Providers, fakeHost } from "@/test/harness"
import type { ModelRecord } from "@/domain/models/model"
import { modelKeys, useImportModels, useModelLibrary } from "./model-queries"

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

  test("the library query the import checks against is the shared one", async () => {
    const host = fakeHost()
    const { result } = renderHook(() => useImportModels(), {
      wrapper: ({ children }) => <Providers host={host}>{children}</Providers>,
    })
    await result.current.mutateAsync([])
    expect(host.models.list).not.toHaveBeenCalled()
    expect(result.current.progress).toBeNull()
    expect(modelKeys.library).toEqual(["models", "library"])
  })
})
