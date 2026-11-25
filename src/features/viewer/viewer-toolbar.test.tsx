import { act, renderHook, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, test, vi } from "vitest"
import { Providers, renderWithProviders } from "@/test/harness"
import { ViewerToolbar, useViewerCamera } from "./viewer-toolbar"

function cameraFixture() {
  return {
    view: "perspective" as const,
    zoom: 1,
    resetKey: 0,
    setView: vi.fn(),
    setZoom: vi.fn(),
    fit: vi.fn(),
  }
}

function renderToolbar(camera = cameraFixture()) {
  const view = renderWithProviders(<ViewerToolbar camera={camera} />)
  return { camera, ...view }
}

describe("viewer toolbar", () => {
  test("shows its buttons under their accessible names", () => {
    const { container } = renderToolbar()
    expect(
      screen.getByRole("toolbar", { name: "3D viewer" })
    ).toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: "Perspective view" })
    ).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Top view" })).toBeInTheDocument()
    for (const name of [
      "Zoom in",
      "Zoom out",
      "Fit bed in view",
      "Visual style",
    ]) {
      const button = screen.getByRole("button", { name })
      expect(button).toHaveAttribute("aria-label", name)
      expect(button).toHaveAttribute("title", name)
    }
    const viewGroup = container.querySelector('[data-slot="toggle-group"]')
    expect(viewGroup).toHaveAttribute("aria-label", "View")
  })

  test("the view buttons choose their view", async () => {
    const { camera } = renderToolbar()
    const user = userEvent.setup()
    await user.click(screen.getByRole("button", { name: "Top view" }))
    expect(camera.setView).toHaveBeenCalledWith("top")
    await user.click(screen.getByRole("button", { name: "Perspective view" }))
    expect(camera.setView).toHaveBeenLastCalledWith("perspective")
  })

  test("re-clicking the pressed view re-applies it", async () => {
    const { camera } = renderToolbar()
    const user = userEvent.setup()
    // The pressed perspective button deselects on click; the toolbar re-applies it.
    await user.click(screen.getByRole("button", { name: "Perspective view" }))
    expect(camera.setView).toHaveBeenCalledWith("perspective")
  })

  test("zoom in steps up and stops at the far limit", async () => {
    const { camera } = renderToolbar({ ...cameraFixture(), zoom: 11.9 })
    const user = userEvent.setup()
    await user.click(screen.getByRole("button", { name: "Zoom in" }))
    expect(camera.setZoom).toHaveBeenCalledWith(12)
    await user.click(screen.getByRole("button", { name: "Zoom in" }))
    expect(camera.setZoom).toHaveBeenLastCalledWith(12)
  })

  test("zoom out steps down and stops at the near limit", async () => {
    const { camera } = renderToolbar({ ...cameraFixture(), zoom: 0.3 })
    const user = userEvent.setup()
    await user.click(screen.getByRole("button", { name: "Zoom out" }))
    expect(camera.setZoom).toHaveBeenCalledWith(0.2)
    await user.click(screen.getByRole("button", { name: "Zoom out" }))
    expect(camera.setZoom).toHaveBeenLastCalledWith(0.2)
  })

  test("the fit button fits the bed", async () => {
    const { camera } = renderToolbar()
    await userEvent
      .setup()
      .click(screen.getByRole("button", { name: "Fit bed in view" }))
    expect(camera.fit).toHaveBeenCalledTimes(1)
  })

  test("the visual style menu offers both styles and keeps the chosen one", async () => {
    localStorage.removeItem("openspindle:viewer:visual-style")
    renderToolbar()
    const user = userEvent.setup()
    await user.click(screen.getByRole("button", { name: "Visual style" }))
    expect(await screen.findByText("Visual style")).toBeInTheDocument()
    expect(await screen.findByText("Smooth Shades")).toBeInTheDocument()
    const edges = await screen.findByText("Shaded Edges")
    await user.click(edges)
    await waitFor(() =>
      expect(localStorage.getItem("openspindle:viewer:visual-style")).toBe(
        "edges"
      )
    )
  })
})

describe("useViewerCamera", () => {
  test("starts on the perspective view at zoom 1", () => {
    const { result } = renderHook(() => useViewerCamera(), {
      wrapper: Providers,
    })
    expect(result.current.view).toBe("perspective")
    expect(result.current.zoom).toBe(1)
    expect(result.current.resetKey).toBe(0)
  })

  test("setView keeps the zoom and asks the viewer to re-fit", () => {
    const { result } = renderHook(() => useViewerCamera(), {
      wrapper: Providers,
    })
    act(() => result.current.setView("top"))
    expect(result.current.view).toBe("top")
    expect(result.current.zoom).toBe(1)
    expect(result.current.resetKey).toBe(1)
    act(() => result.current.setView("top"))
    expect(result.current.resetKey).toBe(2)
  })

  test("fit returns to the perspective view at zoom 1", () => {
    const { result } = renderHook(() => useViewerCamera(), {
      wrapper: Providers,
    })
    act(() => result.current.setView("top"))
    act(() => result.current.setZoom(4))
    act(() => result.current.fit())
    expect(result.current.view).toBe("perspective")
    expect(result.current.zoom).toBe(1)
    expect(result.current.resetKey).toBe(2)
  })
})
