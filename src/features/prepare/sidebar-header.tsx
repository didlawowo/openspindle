import { ChevronRight, Cpu, Plus, RotateCcw } from "lucide-react"
import { toast } from "sonner"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardTitle,
} from "@/components/ui/card"
import { EmptyMedia } from "@/components/ui/empty"
import { Field, FieldLabel } from "@/components/ui/field"
import { OptionSelect } from "@/components/option-select"
import {
  useFixtureLibrary,
  useFixtureLibraryStore,
} from "@/app/fixtures/fixture-context"
import { bedSetupPlacement } from "@/app/fixtures/fixture-library-store"
import { Hint } from "@/components/workspace/hint"
import { bedSetupAnchorsOf } from "@/domain/anchors/stored-anchors"
import {
  useSelectedPlate,
  useWorkspaceStore,
} from "@/app/workspace/workspace-context"
import { kitForDevice } from "@/domain/fixtures/catalog"
import { WORKSPACE_PROFILE, bedSetupOf } from "@/domain/fixtures/profiles"
import { newId } from "@/domain/primitives"
import { openDialog } from "@/features/shell/dialogs"
import { useMachineSnapshot } from "@/platform/machine"

/** The connected machine at a glance; opens the device picker. */
export function DeviceCard() {
  const { t } = useTranslation("prepare")
  const { device, restarting } = useMachineSnapshot().connection
  const imageUrl = device ? kitForDevice(device.model)?.imageUrl : undefined
  return (
    <Card className="gap-0 py-0">
      <CardContent className="p-0">
        <Button
          variant="ghost"
          className="h-auto w-full justify-start gap-3 p-3 text-left"
          onClick={() => openDialog({ kind: "device" })}
        >
          <EmptyMedia variant="icon" className="mb-0 size-12">
            {imageUrl ? (
              <img src={imageUrl} alt="" className="size-full object-contain" />
            ) : (
              <Cpu className="size-7" />
            )}
          </EmptyMedia>
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <CardTitle>
              {device?.name ??
                (restarting
                  ? t("sidebar.restarting")
                  : t("sidebar.connectDevice"))}
            </CardTitle>
            {device && <CardDescription>{device.host}</CardDescription>}
          </div>
          <ChevronRight />
        </Button>
      </CardContent>
    </Card>
  )
}

/**
 * The bed setup of its device the selected plate is set up on: choosing another sets it up on
 * that one (its fixtures, the plate's locked ones aside, and its anchors), and applying it again
 * catches up with its fixtures. A plate set up on a bed setup this computer does not have, such
 * as on another computer, can add it to its device's profile.
 */
export function BedSetupField() {
  const { t } = useTranslation("prepare")
  const bedSetupHint = t("sidebar.bedSetupHint")
  const workspace = useWorkspaceStore()
  const fixtureLibrary = useFixtureLibraryStore()
  const plate = useSelectedPlate()
  const profiles = useFixtureLibrary((library) => library.profiles)
  const definitions = useFixtureLibrary((library) => library.definitions)
  const setup = plate?.setup ?? null
  // Every plate shares the project's device, with its own bed setup.
  const profileId = setup?.deviceId ?? WORKSPACE_PROFILE
  const profile = Object.hasOwn(profiles, profileId)
    ? profiles[profileId]
    : null
  // A bed setup this computer does not have, such as one the plate was set up on elsewhere.
  const missing =
    setup?.bedSetupId &&
    !profile?.bedSetups.some((item) => item.id === setup.bedSetupId)
      ? setup.bedSetupId
      : null
  const bedSetup = profile ? bedSetupOf(profile, setup?.bedSetupId) : null
  const selectedId = missing ?? bedSetup?.id ?? ""
  const apply = (id: string) => {
    if (!plate || !profile) return
    const placement = bedSetupPlacement(profileId, profile, id, definitions)
    const result = workspace.dispatch({
      type: "fixtures.useDefaults",
      plateId: plate.id,
      fixtures: placement.fixtures,
      anchors: placement.anchors,
      bedSetupId: placement.bedSetupId ?? null,
    })
    if (!result.ok) toast.error(result.error)
  }
  const keep = () => {
    if (!plate || !setup || !profile) return
    fixtureLibrary.keepBedSetup(
      profileId,
      {
        id: setup.bedSetupId ?? newId(),
        name: plate.name || t("sidebar.plateBedSetup"),
        fixtures: setup.fixtures.map((item) => ({
          definitionId: item.definition.id,
          enabled: item.enabled,
          position: item.position,
          rotation: item.rotation,
        })),
        anchors: setup.anchors ? bedSetupAnchorsOf(setup.anchors) : [],
      },
      setup.fixtures.map((item) => item.definition)
    )
  }
  return (
    <Field orientation="horizontal">
      <FieldLabel htmlFor="bed-setup" className="shrink-0">
        <Hint text={bedSetupHint}>{t("sidebar.bedSetup")}</Hint>
      </FieldLabel>
      <OptionSelect
        id="bed-setup"
        aria-description={bedSetupHint}
        className="min-w-0 flex-1"
        options={[
          ...(profile?.bedSetups ?? []).map((item) => ({
            value: item.id,
            label: item.name,
          })),
          ...(missing || !profile
            ? [
                {
                  value: selectedId,
                  label: t("sidebar.notOnThisComputer"),
                  disabled: true,
                },
              ]
            : []),
        ]}
        value={selectedId}
        disabled={!plate || !profile}
        onValueChange={apply}
      />
      {bedSetup &&
        (!missing ? (
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={t("sidebar.reapply")}
            title={t("sidebar.reapplyTitle")}
            disabled={!plate}
            onClick={() => apply(bedSetup.id)}
          >
            <RotateCcw />
          </Button>
        ) : (
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={t("sidebar.addBedSetup")}
            title={t("sidebar.addBedSetupTitle")}
            onClick={keep}
          >
            <Plus />
          </Button>
        ))}
    </Field>
  )
}
