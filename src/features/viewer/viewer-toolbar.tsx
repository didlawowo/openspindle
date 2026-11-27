import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import {
  Camera,
  Cuboid,
  Cylinder,
  Layers3,
  LayoutGrid,
  Lock,
  LockOpen,
  Maximize,
  Minus,
  MousePointer2,
  Plus,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Separator } from "@/components/ui/separator"
import { Toggle } from "@/components/ui/toggle"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import type { ViewMode } from "@/components/workspace/bed-viewer"
import { keyForViewer } from "@/components/workspace/viewer/setup-arranger"
import {
  toggleBedPicture,
  useBedPicture,
} from "@/features/bed-photo/bed-picture"
import { isVisualStyle, useVisualStyle } from "./visual-style"

/** Limits match the viewer's orbit controls, which report wheel zoom through onZoomChange. */
const ZOOM = { min: 0.2, max: 12, step: 0.25 } as const

export type ViewerCamera = {
  readonly view: ViewMode
  readonly zoom: number
  /** Changes to re-apply the view preset (and fit the bed). */
  readonly resetKey: number
  readonly setView: (view: ViewMode) => void
  readonly setZoom: (zoom: number) => void
  readonly fit: () => void
  /** The view holds its angle: drags move the selected item instead of orbiting it. */
  readonly locked: boolean
  readonly toggleLocked: () => void
  /** Every plate on one bed, at its own coordinates, instead of one bed each. */
  readonly oneBed: boolean
  readonly toggleOneBed: () => void
}

/** Camera state of one bed viewer: view preset, zoom and fit. */
export function useViewerCamera(): ViewerCamera {
  const [view, setViewMode] = useState<ViewMode>("perspective")
  const [zoom, setZoom] = useState(1)
  const [resetKey, setResetKey] = useState(0)
  const [locked, setLocked] = useState(false)
  const [oneBed, setOneBed] = useState(false)
  // Shift+L, captured first, so the arrange keys' own L (a fixture's lock) leaves it alone.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!keyForViewer(event) || event.repeat) return
      if (!event.shiftKey || event.key.toLowerCase() !== "l") return
      if (event.metaKey || event.ctrlKey || event.altKey) return
      event.preventDefault()
      setLocked((current) => !current)
    }
    window.addEventListener("keydown", onKeyDown, { capture: true })
    return () =>
      window.removeEventListener("keydown", onKeyDown, { capture: true })
  }, [])
  return {
    view,
    zoom,
    resetKey,
    locked,
    toggleLocked: () => setLocked((current) => !current),
    oneBed,
    toggleOneBed: () => setOneBed((current) => !current),
    setView: (next) => {
      setViewMode(next)
      // Re-apply the preset even when this view is already selected.
      setResetKey((key) => key + 1)
    },
    setZoom,
    fit: () => {
      setViewMode("perspective")
      setZoom(1)
      setResetKey((key) => key + 1)
    },
  }
}

const isViewMode = (value: unknown): value is ViewMode =>
  value === "perspective" || value === "top" || value === "front"

export function ViewerToolbar({ camera }: { camera: ViewerCamera }) {
  const { t } = useTranslation("viewer")
  const bedPicture = useBedPicture()
  return (
    <Card
      className="absolute top-1/2 left-4 z-10 -translate-y-1/2 gap-1 p-1"
      role="toolbar"
      aria-label={t("toolbar.region")}
      aria-orientation="vertical"
    >
      <ToggleGroup
        orientation="vertical"
        spacing={1}
        value={[camera.view]}
        onValueChange={(value) => {
          // Clicking the pressed view deselects it (an empty value): re-apply that view.
          const next = value.at(0)
          camera.setView(isViewMode(next) ? next : camera.view)
        }}
        aria-label={t("toolbar.view")}
      >
        <ToggleGroupItem
          value="perspective"
          aria-label={t("toolbar.perspective")}
        >
          <MousePointer2 />
        </ToggleGroupItem>
        <ToggleGroupItem value="top" aria-label={t("toolbar.top")}>
          <Layers3 />
        </ToggleGroupItem>
      </ToggleGroup>
      <Separator />
      <Button
        variant="ghost"
        size="icon"
        aria-label={t("toolbar.zoomIn")}
        title={t("toolbar.zoomIn")}
        onClick={() =>
          camera.setZoom(Math.min(camera.zoom + ZOOM.step, ZOOM.max))
        }
      >
        <Plus />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        aria-label={t("toolbar.zoomOut")}
        title={t("toolbar.zoomOut")}
        onClick={() =>
          camera.setZoom(Math.max(camera.zoom - ZOOM.step, ZOOM.min))
        }
      >
        <Minus />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        aria-label={t("toolbar.fit")}
        title={t("toolbar.fit")}
        onClick={camera.fit}
      >
        <Maximize />
      </Button>
      <Separator />
      <Toggle
        size="sm"
        className="size-8"
        pressed={camera.locked}
        aria-label={
          camera.locked ? t("toolbar.unlockView") : t("toolbar.lockView")
        }
        title={camera.locked ? t("toolbar.unlockView") : t("toolbar.lockView")}
        onPressedChange={camera.toggleLocked}
      >
        {camera.locked ? <Lock /> : <LockOpen />}
      </Toggle>
      <Toggle
        size="sm"
        className="size-8"
        pressed={camera.oneBed}
        aria-label={t("toolbar.oneBed")}
        title={t("toolbar.oneBed")}
        onPressedChange={camera.toggleOneBed}
      >
        <LayoutGrid />
      </Toggle>
      {bedPicture.picture && (
        <Toggle
          size="sm"
          className="size-8"
          pressed={bedPicture.shown}
          aria-label={t("toolbar.bedPicture")}
          title={t("toolbar.bedPicture")}
          onPressedChange={toggleBedPicture}
        >
          <Camera />
        </Toggle>
      )}
      <Separator />
      <VisualStyleMenu />
    </Card>
  )
}

/** The 3D views' visual style, from a menu beside the toolbar; its button shows the one chosen. */
function VisualStyleMenu() {
  const { t } = useTranslation("viewer")
  const [style, setStyle] = useVisualStyle()
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            aria-label={t("toolbar.style")}
            title={t("toolbar.style")}
          />
        }
      >
        {style === "edges" ? <Cuboid /> : <Cylinder />}
      </DropdownMenuTrigger>
      <DropdownMenuContent side="right" className="w-56">
        <DropdownMenuGroup>
          <DropdownMenuLabel>{t("toolbar.style")}</DropdownMenuLabel>
          <DropdownMenuRadioGroup
            value={style}
            onValueChange={(value) => {
              if (isVisualStyle(value)) setStyle(value)
            }}
          >
            <DropdownMenuRadioItem value="smooth">
              <Cylinder />
              {t("toolbar.smooth")}
            </DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="edges">
              <Cuboid />
              {t("toolbar.edges")}
            </DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
