import {
  act,
  cleanup,
  renderHook,
  screen,
  waitFor,
} from "@testing-library/react"
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
    locked: false,
    toggleLocked: vi.fn(),
    oneBed: false,
    toggleOneBed: vi.fn(),
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
      "Lock the view",
      "Plates on one bed",
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

describe("the view lock", () => {
  test("the toolbar's lock button toggles it, and says what it does", async () => {
    const { camera } = renderToolbar()
    const user = userEvent.setup()
    await user.click(screen.getByRole("button", { name: "Lock the view" }))
    expect(camera.toggleLocked).toHaveBeenCalled()
  })

  test("a locked view offers to unlock", () => {
    renderToolbar({ ...cameraFixture(), locked: true })
    expect(
      screen.getByRole("button", { name: "Unlock the view" })
    ).toHaveAttribute("aria-pressed", "true")
  })

  test("Shift+L locks and unlocks the view", async () => {
    const { result } = renderHook(() => useViewerCamera(), {
      wrapper: ({ children }) => <Providers>{children}</Providers>,
    })
    expect(result.current.locked).toBe(false)
    await act(async () => {
      window.dispatchEvent(
        new KeyboardEvent("keydown", { key: "L", shiftKey: true })
      )
    })
    expect(result.current.locked).toBe(true)
    await act(async () => {
      window.dispatchEvent(
        new KeyboardEvent("keydown", { key: "l", shiftKey: true })
      )
    })
    expect(result.current.locked).toBe(false)
  })

  test("L alone, another modifier or a repeat leaves it alone", async () => {
    const { result } = renderHook(() => useViewerCamera(), {
      wrapper: ({ children }) => <Providers>{children}</Providers>,
    })
    for (const event of [
      new KeyboardEvent("keydown", { key: "l" }),
      new KeyboardEvent("keydown", { key: "l", shiftKey: true, metaKey: true }),
      new KeyboardEvent("keydown", {
        key: "l",
        shiftKey: true,
        ctrlKey: true,
      }),
      new KeyboardEvent("keydown", {
        key: "l",
        shiftKey: true,
        altKey: true,
      }),
      new KeyboardEvent("keydown", { key: "l", shiftKey: true, repeat: true }),
    ]) {
      await act(async () => {
        window.dispatchEvent(event)
      })
      expect(result.current.locked).toBe(false)
    }
  })

  test("typing in a field keeps its own Shift+L", async () => {
    const { result } = renderHook(() => useViewerCamera(), {
      wrapper: ({ children }) => <Providers>{children}</Providers>,
    })
    const input = document.createElement("input")
    document.body.append(input)
    await act(async () => {
      input.dispatchEvent(
        new KeyboardEvent("keydown", {
          key: "l",
          shiftKey: true,
          bubbles: true,
        })
      )
    })
    input.remove()
    expect(result.current.locked).toBe(false)
  })
})

describe("the one-bed view", () => {
  test("it starts off, and the camera's toggle turns it on and off", () => {
    const { result } = renderHook(() => useViewerCamera(), {
      wrapper: ({ children }) => <Providers>{children}</Providers>,
    })
    expect(result.current.oneBed).toBe(false)
    act(() => result.current.toggleOneBed())
    expect(result.current.oneBed).toBe(true)
    act(() => result.current.toggleOneBed())
    expect(result.current.oneBed).toBe(false)
  })

  test("the toolbar's button toggles it, and reads as pressed once on", async () => {
    const { camera } = renderToolbar()
    const user = userEvent.setup()
    await user.click(screen.getByRole("button", { name: "Plates on one bed" }))
    expect(camera.toggleOneBed).toHaveBeenCalled()
    cleanup()
    renderToolbar({ ...cameraFixture(), oneBed: true })
    expect(
      screen.getByRole("button", { name: "Plates on one bed" })
    ).toHaveAttribute("aria-pressed", "true")
  })
})
