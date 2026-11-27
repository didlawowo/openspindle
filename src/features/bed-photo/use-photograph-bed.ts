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
import { bedObjects, fixtureFootprints } from "@/domain/fixtures/bed-objects"
import type {
  BedObject,
  BedView,
  FootprintSize,
} from "@/domain/fixtures/bed-objects"
import type { BedArea, BedPhoto } from "@/domain/fixtures/bed-photo"
import type { FixtureKit } from "@/domain/fixtures/fixture-kit"
import { kitForPlate } from "@/domain/fixtures/catalog"
import type { Point3 } from "@/domain/primitives"
import { machineId } from "@/machine/contract"
import type { MachineSnapshot } from "@/machine/contract"
import {
  useMachineCommand,
  useMachineHost,
  useMachineSnapshot,
} from "@/platform/machine"
import {
  requestStop,
  setBedPicture,
  setShooting,
  stopRequested,
  useBedPicture,
} from "./bed-picture"
import { CameraSilentError, decodePhoto, watchFrames } from "./camera-frames"

/** The side of a cell of the bed's picture, in millimetres. */
const CELL = 0.5
/** The picture kept after a move: the ones before it were taken while the exposure settled. */
const SETTLE_FRAMES = 5
const FRAME_TIMEOUT_MS = 20000
/** How far X or Z may read from where the photos began before the bed is taken to have moved otherwise. */
const DRIFT = 0.05

/** The footprints of the kit's clamps: what is as narrow on the bed holds stock, and is none. */
function clampSizes(kit: FixtureKit): FootprintSize[] {
  return kit.fixtures
    .filter(({ fixture }) => fixture.kind === "clamp")
    .flatMap(({ fixture }) =>
      fixtureFootprints(fixture.model.bounds, fixture.solids)
    )
}

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
 * bed (`bedMosaic`). Each move is the machine's own verified command, never sent again, decided
 * from where the machine reports itself then; the first that fails ends it where the machine
 * is, and `run` again while it shoots stops it after the move under way.
 */
export function usePhotographBed() {
  const { t } = useTranslation("prepare")
  const plate = useSelectedPlate()
  const machine = useMachineHost()
  const command = useMachineCommand()
  const { availability, connection, features, limits } = useMachineSnapshot()
  const shooting = useBedPicture().shooting !== null
  const connectedId = connection.device ? machineId(connection.device) : null
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
    if (plate.setup.deviceId !== connectedId) return t("bedPhoto.otherDevice")
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
      // The machine as it is now, not as the last command left it: another screen may have
      // moved it since.
      const now = async () => place(await machine.snapshot())
      const park = () =>
        command.mutateAsync({ type: "goTo", target: "clearance" })
      const keepGoing = () => {
        if (stopRequested()) throw new StoppedError()
      }
      // A camera that gives nothing is found before the machine moves.
      await frames.next(1, FRAME_TIMEOUT_MS)
      keepGoing()
      const parked = place(await park())
      const still = async () => {
        const here = await now()
        const drifted = [0, 2].some(
          (axis) => Math.abs(here.at[axis] - parked.at[axis]) > DRIFT
        )
        if (drifted) throw new Error(t("bedPhoto.drifted"))
        return here
      }
      const photos: { jpeg: Uint8Array; spindleY: number }[] = []
      for (const stop of shootingOrder(parked.y, stops)) {
        for (;;) {
          keepGoing()
          const distance = jogToward((await still()).y, stop, {
            min: limits.jogMinDistance,
            max: limits.jogMaxDistance,
          })
          if (distance === null) break
          await command.mutateAsync({
            type: "jog",
            axis: "Y",
            distance,
            speedScale: limits.jogMaxSpeedScale,
          })
        }
        const jpeg = await frames.next(SETTLE_FRAMES, FRAME_TIMEOUT_MS)
        photos.push({ jpeg, spindleY: (await still()).y })
        setShooting({ done: photos.length, total: stops.length })
      }
      keepGoing()
      await park()
      const pictures = await Promise.all(
        photos.map(({ jpeg }) => decodePhoto(jpeg))
      )
      const { min, max } = kit.bed.bounds
      const area: BedArea = { min: [min[0], min[1]], max: [max[0], max[1]] }
      const taken = pictures.map(({ width, height }, index): BedPhoto => ({
        width,
        height,
        spindleY: photos[index].spindleY,
      }))
      const mosaic = bedMosaic(camera, taken, area, CELL)
      const view: BedView = { mosaic, area, cell: CELL }
      // The photo is worth keeping even when nothing can be told from it.
      let objects: readonly BedObject[] = []
      try {
        objects = bedObjects(camera, taken, pictures, view, clampSizes(kit))
      } catch (error) {
        log.error("Finding what lies on the bed failed", error)
      }
      setBedPicture(
        {
          area,
          columns: mosaic.columns,
          rows: mosaic.rows,
          pixels: mosaicPixels(mosaic, pictures),
        },
        {
          deviceId: plate.setup.deviceId,
          camera,
          photos: taken,
          view,
          objects,
        }
      )
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
    if (shooting) requestStop()
    else void shoot()
  }
  return { reason, shooting, run }
}
