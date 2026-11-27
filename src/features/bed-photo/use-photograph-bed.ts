import { useRef } from "react"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"
import { log } from "@/app/errors/log"
import { bedPositionOf } from "@/app/workspace/machine-program"
import { useSelectedPlate } from "@/app/workspace/workspace-context"
import {
  bedMosaic,
  jogToward,
  mosaicPixels,
  shootingOrder,
} from "@/domain/fixtures/bed-photo"
import type { BedArea } from "@/domain/fixtures/bed-photo"
import { kitForPlate } from "@/domain/fixtures/catalog"
import type { Point3 } from "@/domain/primitives"
import type { MachineSnapshot } from "@/machine/contract"
import {
  useMachineCommand,
  useMachineHost,
  useMachineSnapshot,
} from "@/platform/machine"
import { setBedPicture, setShooting, useBedPicture } from "./bed-picture"
import { CameraSilentError, decodePhoto, watchFrames } from "./camera-frames"

/** The side of a cell of the bed's picture, in millimetres. */
const CELL = 0.5
/** The picture kept after a move: the ones before it were taken while the exposure settled. */
const SETTLE_FRAMES = 5
const FRAME_TIMEOUT_MS = 20000
/** How far X or Z may read from where the photos began before the bed is taken to have moved otherwise. */
const DRIFT = 0.05

/** Stopped by the user between two moves. */
class StoppedError extends Error {}

/** Where the machine reports its spindle, in machine coordinates. */
function machinePlace({ telemetry }: MachineSnapshot): Point3 | null {
  const at = telemetry?.machine
  return at ? [at.x, at.y, at.z] : null
}

/**
 * Photographs the connected machine's bed for the selected plate: parks the spindle at the
 * clearance, jogs the bed along Y to each of the camera's stops (`MachineCamera.stops`), keeps a
 * picture at each, parks again, and assembles the view from above the 3D view then draws on the
 * bed (`bedMosaic`). Each move is the machine's own verified command, never sent again; the
 * first that fails ends it where the machine is, and `run` again while it shoots stops it after
 * the move under way.
 */
export function usePhotographBed() {
  const { t } = useTranslation("prepare")
  const plate = useSelectedPlate()
  const machine = useMachineHost()
  const command = useMachineCommand()
  const { availability, features, limits } = useMachineSnapshot()
  const shooting = useBedPicture().shooting !== null
  const stopped = useRef(false)
  const kit = plate ? kitForPlate(plate) : null
  const camera = kit?.camera ?? null
  const stops = camera?.stops ?? []

  const reason = (() => {
    if (shooting) return null
    const blocked = [availability.goTo, availability.jog].find(
      (entry) => !entry.allowed
    )
    if (blocked) return blocked.reason ?? t("bedPhoto.unavailable")
    if (!plate || !limits) return t("bedPhoto.unavailable")
    if (!stops.length || features?.camera !== true)
      return t("bedPhoto.noCamera")
    return null
  })()

  const why = (error: unknown) => {
    if (error instanceof CameraSilentError) return t("bedPhoto.cameraSilent")
    return error instanceof Error ? error.message : String(error)
  }

  const shoot = async () => {
    if (!plate || !kit || !camera || !limits) return
    const place = (snapshot: MachineSnapshot) => {
      const at = machinePlace(snapshot)
      const onBed = at && bedPositionOf(plate, at)
      if (!at || !onBed) throw new Error(t("bedPhoto.noPosition"))
      return { at, y: onBed[1] }
    }
    const frames = watchFrames(machine)
    setShooting({ done: 0, total: stops.length })
    try {
      const park = () =>
        command.mutateAsync({ type: "goTo", target: "clearance" })
      let snapshot = await park()
      const parked = place(snapshot)
      const photos: { jpeg: Uint8Array; spindleY: number }[] = []
      for (const stop of shootingOrder(parked.y, stops)) {
        for (;;) {
          if (stopped.current) throw new StoppedError()
          const here = place(snapshot)
          const drifted = [0, 2].some(
            (axis) => Math.abs(here.at[axis] - parked.at[axis]) > DRIFT
          )
          if (drifted) throw new Error(t("bedPhoto.drifted"))
          const distance = jogToward(here.y, stop, {
            min: limits.jogMinDistance,
            max: limits.jogMaxDistance,
          })
          if (distance === null) break
          snapshot = await command.mutateAsync({
            type: "jog",
            axis: "Y",
            distance,
            speedScale: limits.jogMaxSpeedScale,
          })
        }
        photos.push({
          jpeg: await frames.next(SETTLE_FRAMES, FRAME_TIMEOUT_MS),
          spindleY: place(snapshot).y,
        })
        setShooting({ done: photos.length, total: stops.length })
      }
      await park()
      const pictures = await Promise.all(
        photos.map(({ jpeg }) => decodePhoto(jpeg))
      )
      const { min, max } = kit.bed.bounds
      const area: BedArea = { min: [min[0], min[1]], max: [max[0], max[1]] }
      const mosaic = bedMosaic(
        camera,
        pictures.map(({ width, height }, index) => ({
          width,
          height,
          spindleY: photos[index].spindleY,
        })),
        area,
        CELL
      )
      setBedPicture({
        area,
        columns: mosaic.columns,
        rows: mosaic.rows,
        pixels: mosaicPixels(mosaic, pictures),
      })
      toast.success(t("bedPhoto.done"))
    } catch (error) {
      if (error instanceof StoppedError) {
        toast.info(t("bedPhoto.stopped"))
        return
      }
      log.error("Photographing the bed failed", error)
      toast.error(t("bedPhoto.failed"), { description: why(error) })
    } finally {
      frames.stop()
      setShooting(null)
    }
  }

  /** Starts the photos, or stops them after the move under way. */
  const run = () => {
    if (shooting) {
      stopped.current = true
      return
    }
    stopped.current = false
    void shoot()
  }
  return { reason, shooting, run }
}
