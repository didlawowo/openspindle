import { useMemo } from "react"
import { useTranslation } from "react-i18next"
import type { TFunction } from "i18next"
import { toast } from "sonner"
import { useFixtureLibrary } from "@/app/fixtures/fixture-context"
import type { WorkspaceStore } from "@/app/workspace/store"
import { fixtureInstance, isBedKind } from "@/domain/fixtures/definitions"
import type {
  FixtureDefinition,
  FixtureKind,
} from "@/domain/fixtures/definitions"
import {
  DEFAULT_BED_SETUP,
  WORKSPACE_PROFILE,
  bedSetupDefinitions,
  bedSetupOf,
} from "@/domain/fixtures/profiles"
import type { BedSetup } from "@/domain/fixtures/profiles"
import type { Plate } from "@/domain/plate/plate"
import { selectSetupItem } from "../arrange/arrange-state"

/** Fixture kinds as fixtures are offered: grouped, in this order. */
export const FIXTURE_KIND_GROUPS = [
  "bed",
  "wasteboard",
  "clamp",
  "holder",
  "vise",
  "vacuum-bed",
  "rotary",
  "other",
] as const satisfies readonly FixtureKind[]

/** The name a fixture kind group shows, in the order of `FIXTURE_KIND_GROUPS`. */
export const fixtureKindGroupLabel = (
  t: TFunction<"prepare">,
  kind: FixtureKind
): string => {
  switch (kind) {
    case "bed":
      return t("fixtures.kindGroup.bed")
    case "wasteboard":
      return t("fixtures.kindGroup.wasteboard")
    case "clamp":
      return t("fixtures.kindGroup.clamp")
    case "holder":
      return t("fixtures.kindGroup.holder")
    case "vise":
      return t("fixtures.kindGroup.vise")
    case "vacuum-bed":
      return t("fixtures.kindGroup.vacuumBed")
    case "rotary":
      return t("fixtures.kindGroup.rotary")
    default:
      return t("fixtures.kindGroup.other")
  }
}

/**
 * Compatible shared fixtures with the defaults of the plate's bed setup applied.
 */
export function usePlateBedSetup(
  plate: Plate
): BedSetup & { definitions: FixtureDefinition[] } {
  const { t } = useTranslation("prepare")
  const profiles = useFixtureLibrary((library) => library.profiles)
  const definitions = useFixtureLibrary((library) => library.definitions)
  const { deviceId, bedSetupId } = plate.setup
  const profileId = deviceId ?? WORKSPACE_PROFILE
  return useMemo(() => {
    const setup: BedSetup = Object.hasOwn(profiles, profileId)
      ? bedSetupOf(profiles[profileId], bedSetupId)
      : {
          id: bedSetupId ?? DEFAULT_BED_SETUP,
          name: t("fixtures.notOnThisComputer"),
          fixtures: [],
          anchors: [],
        }
    return {
      ...setup,
      definitions: bedSetupDefinitions(definitions, setup, deviceId),
    }
  }, [profiles, definitions, profileId, deviceId, bedSetupId, t])
}

/**
 * Adds a fixture of `definition` to the plate and selects it in the viewer, so it can be moved
 * into place right away; a bed replaces the plate's bed, and a bed the plate had already stays
 * its bed and is selected instead. A refusal is shown; returns whether it was added.
 */
export function addFixtureToPlate(
  workspace: WorkspaceStore,
  plateId: string,
  definition: FixtureDefinition
): boolean {
  const added = fixtureInstance(definition)
  const result = workspace.dispatch({
    type: "fixture.add",
    plateId,
    fixture: added,
  })
  if (!result.ok) {
    toast.error(result.error)
    return false
  }
  const fixtures =
    result.value.plates.find(({ id }) => id === plateId)?.setup.fixtures ?? []
  const selected =
    fixtures.find((item) => item.id === added.id) ??
    fixtures.find(
      (item) =>
        isBedKind(item.definition.kind) && item.definition.id === definition.id
    )
  if (selected)
    selectSetupItem(
      { plateId, item: { kind: "fixture", id: selected.id } },
      !isBedKind(definition.kind)
    )
  return true
}
