import { useEffect } from "react"
import { useTranslation } from "react-i18next"
import type { TFunction } from "i18next"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field"
import { Switch } from "@/components/ui/switch"
import { ColorField } from "@/components/color-field"
import { Hint } from "@/components/workspace/hint"
import {
  SURFACE_FINISHES,
  SURFACE_MATERIALS,
} from "@/domain/materials/surface-material"
import { OptionSelect } from "@/components/option-select"
import { NameField } from "@/components/name-field"
import {
  BoundedMeasurementInput,
  PointFieldSet,
  PointFields,
} from "@/components/workspace/coordinate-input"
import { FixtureOriginSelect } from "@/components/workspace/fixture-origin-select"
import { DIMENSION_AXES } from "@/components/workspace/measurement-input"
import {
  useFixtureLibrary,
  useFixtureLibraryStore,
} from "@/app/fixtures/fixture-context"
import { useWorkspaceStore } from "@/app/workspace/workspace-context"
import { definitionFinish } from "@/domain/fixtures/catalog"
import { FIXTURE_MACHINE_TYPES } from "@/domain/fixtures/compatibility"
import { fail, normalizeText, ok } from "@/domain/primitives"
import {
  FIXTURE_NAME_LIMIT,
  boxModel,
  fixtureModelOf,
  libraryModelId,
  withBoxSize,
  withDefinitionOrigin,
} from "@/domain/fixtures/definitions"
import type {
  FixtureDefinition,
  FixtureKind,
  FixtureModel,
} from "@/domain/fixtures/definitions"
import type { Point3 } from "@/domain/nc/gcode"
import { useModelLibrary } from "@/features/models/model-queries"
import { modelDetails } from "@/features/models/models-dialog"
import { AppDialog } from "@/features/shell/app-dialog"
import { openDialog } from "@/features/shell/dialogs"
import type { WorkspaceDialog } from "@/features/shell/dialogs"
import { FixtureOrientationField } from "./fixture-orientation-field"
import { MountPointsField } from "./mount-points-field"

/** A fixture without a material of its own is drawn as its model or its type is. */
const AUTOMATIC = "automatic"

type DeviceT = TFunction<"device">

/** The material a fixture is drawn with, the automatic choice first. */
function materialOptions(t: DeviceT): Array<{
  value: (typeof SURFACE_MATERIALS)[number] | typeof AUTOMATIC
  label: string
}> {
  return [
    { value: AUTOMATIC, label: t("fixture.materialAutomatic") },
    ...SURFACE_MATERIALS.map((material) => ({
      value: material,
      label: SURFACE_FINISHES[material].label,
    })),
  ]
}

/** Fixture kinds, named in the language the interface shows. */
export const FIXTURE_KINDS: readonly FixtureKind[] = [
  "bed",
  "clamp",
  "holder",
  "vise",
  "vacuum-bed",
  "wasteboard",
  "rotary",
  "other",
]

/** What a fixture kind is called. */
export function fixtureKindLabel(t: DeviceT, kind: FixtureKind) {
  return t(`fixtureKinds.${kind}`)
}
const NO_MODEL = ""
const BOX_MODEL = "box"
const BUNDLED_MODEL = "bundled"
const BOX_SIZE_LIMIT = 2000

/** A box the size of the model it replaces; a 50 mm square, 10 mm tall, without one. */
function replacementBox(model: FixtureModel | null) {
  if (!model) return boxModel(50, 50, 10)
  const { min, max } = model.bounds
  const [width, depth, height] = max.map((value, axis) =>
    Math.max(value - min[axis], 0.01)
  )
  return boxModel(width, depth, height)
}

/**
 * The model a fixture draws: a box, one from the Models library, or the one bundled with the
 * app.
 */
function FixtureModelField({
  definition,
  onChange,
  onModels,
}: {
  definition: FixtureDefinition
  onChange: (model: FixtureModel | null) => void
  /** Opens the Models library. */
  onModels: () => void
}) {
  const { t } = useTranslation("device")
  const { t: tModels } = useTranslation("models")
  const models = useModelLibrary().data ?? []
  const id = `fixture-model-${definition.id}`
  const source = definition.model?.source.kind
  const bundled = source === "bundled"
  const modelId = libraryModelId(definition)
  const selected = models.find((model) => model.id === modelId)
  let value = NO_MODEL
  if (bundled) value = BUNDLED_MODEL
  else if (source === "box") value = BOX_MODEL
  else if (modelId) value = modelId
  const items = [
    { value: NO_MODEL, label: t("fixture.noModel") },
    { value: BOX_MODEL, label: t("fixture.box") },
    ...(bundled
      ? [{ value: BUNDLED_MODEL, label: t("fixture.bundledModel") }]
      : []),
    ...(modelId && !selected
      ? [{ value: modelId, label: t("fixture.missingModel") }]
      : []),
    ...models.map((model) => ({ value: model.id, label: model.name })),
  ]
  let description = t("fixture.noModelDescription")
  if (bundled) description = t("fixture.bundledDescription")
  else if (source === "box") description = t("fixture.boxDescription")
  else if (selected)
    // Stryker disable next-line OptionalChaining -- a selected model means the definition has one
    description = modelDetails(tModels, selected, definition.model?.bounds)
  else if (modelId) description = t("fixture.missingModelDescription")
  return (
    <Field>
      <FieldLabel htmlFor={id}>{t("fixture.model")}</FieldLabel>
      <div className="flex gap-2">
        <OptionSelect
          options={items}
          value={value}
          onValueChange={(next) => {
            if (next === value || next === BUNDLED_MODEL) return
            if (next === BOX_MODEL) {
              onChange(replacementBox(definition.model))
              return
            }
            const model = models.find((item) => item.id === next)
            onChange(model ? fixtureModelOf(model) : null)
          }}
          id={id}
          aria-label={t("fixture.modelAria", { name: definition.name })}
          className="min-w-0 flex-1"
        />
        <Button variant="outline" onClick={onModels}>
          {t("fixture.models")}
        </Button>
      </div>
      <FieldDescription className="font-numeric">
        {description}
      </FieldDescription>
    </Field>
  )
}

/** A box model's size; its origin keeps its place in the box. */
function BoxSizeFields({
  definition,
  model,
  onChange,
}: {
  definition: FixtureDefinition
  model: FixtureModel
  onChange: (model: FixtureModel) => void
}) {
  const { t } = useTranslation("device")
  const { min, max } = model.bounds
  const size = max.map((value, axis) => value - min[axis])
  return (
    <FieldSet>
      <FieldLegend>{t("fixture.size")}</FieldLegend>
      <FieldGroup className="gap-3">
        {(["width", "depth", "height"] as const).map((key, axis) => (
          <Field key={key}>
            <FieldLabel
              className="sr-only"
              htmlFor={`fixture-${key}-${definition.id}`}
            >
              {t("fixture.dimensionLabel", {
                name: definition.name,
                dimension: t(`fixture.dimensions.${key}`),
              })}
            </FieldLabel>
            <BoundedMeasurementInput
              id={`fixture-${key}-${definition.id}`}
              axis={DIMENSION_AXES[key]}
              unit="mm"
              label={t("fixture.dimensionLabel", {
                name: definition.name,
                dimension: t(`fixture.dimensions.${key}`),
              })}
              min={0.01}
              max={BOX_SIZE_LIMIT}
              value={size[axis]}
              onCommit={(value) => {
                const next = [...size] as Point3
                next[axis] = value
                onChange(withBoxSize(model, next))
              }}
            />
          </Field>
        ))}
      </FieldGroup>
    </FieldSet>
  )
}

/**
 * Where new plates put the fixture: the bed position of its origin, which it is positioned by
 * and turns about. Choosing another of its model's points as the origin leaves it where it is.
 */
function DefaultPositionFields({
  definition,
  onChange,
}: {
  definition: FixtureDefinition
  onChange: (change: Partial<FixtureDefinition>, origin?: Point3) => void
}) {
  const { t } = useTranslation("device")
  const { model } = definition
  return (
    <FieldSet>
      <FieldLegend className="flex w-full items-center justify-between gap-3">
        <span>{t("fixture.defaultPosition")}</span>
        {model && (
          <FixtureOriginSelect
            name={definition.name}
            model={model}
            onChoose={(point) => {
              const framed = withDefinitionOrigin(definition, point)
              onChange({ model: framed.model }, point)
            }}
          />
        )}
      </FieldLegend>
      <PointFields
        label={t("fixture.defaultPosition")}
        unit="mm"
        value={definition.defaultPosition}
        onChange={(defaultPosition) => onChange({ defaultPosition })}
      />
    </FieldSet>
  )
}

/**
 * A shared fixture's appearance and compatibility, with default placement kept for the selected
 * bed setup. Plates holding the shared fixture follow its intrinsic edits.
 */
export function FixtureDefinitionDialog({
  dialog,
  onClose,
}: {
  dialog: Extract<WorkspaceDialog, { kind: "fixture-definition" }>
  onClose: () => void
}) {
  const { t } = useTranslation("device")
  const fixtures = useFixtureLibraryStore()
  const workspace = useWorkspaceStore()
  const profile = useFixtureLibrary((library) =>
    Object.hasOwn(library.profiles, dialog.profileId)
      ? library.profiles[dialog.profileId]
      : null
  )
  const definitions = useFixtureLibrary((library) => library.definitions)
  const bedSetup = profile?.bedSetups.find(
    (setup) => setup.id === dialog.bedSetupId
  )
  const shared =
    definitions.find((item) => item.id === dialog.definitionId) ?? null
  const defaults = bedSetup?.fixtures.find(
    (item) => item.definitionId === dialog.definitionId
  )
  const definition = shared && {
    ...shared,
    defaultEnabled: defaults?.enabled ?? false,
    defaultPosition: defaults?.position ?? shared.defaultPosition,
    defaultRotation: defaults?.rotation ?? shared.defaultRotation,
  }
  useEffect(() => {
    if (!shared) onClose()
  }, [shared, onClose])
  const library = useModelLibrary().data
  if (!shared || !definition) return null
  const { id } = definition
  // Intrinsic edits reach every instance; defaults belong only to this bed setup.
  const update = (change: Partial<FixtureDefinition>, origin?: Point3) => {
    const { defaultEnabled, defaultPosition, defaultRotation, ...intrinsic } =
      change
    if (Object.keys(intrinsic).length) {
      const changed = { ...shared, ...intrinsic }
      const result = workspace.dispatch(
        {
          type: "fixtures.redefine",
          definition: changed,
          previous: shared,
          origin,
        },
        { record: false }
      )
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      fixtures.setDefinition(changed, origin)
    }
    if (
      bedSetup &&
      (defaultEnabled !== undefined ||
        (!origin && defaultPosition !== undefined) ||
        defaultRotation !== undefined)
    )
      fixtures.setBedFixture(
        dialog.bedSetupId,
        id,
        {
          ...(defaultEnabled !== undefined ? { defaultEnabled } : {}),
          ...(!origin && defaultPosition !== undefined
            ? { defaultPosition }
            : {}),
          ...(defaultRotation !== undefined ? { defaultRotation } : {}),
        },
        dialog.profileId
      )
  }
  const machines = Array.isArray(definition.compatibility)
    ? definition.compatibility
    : []
  const allMachines = !Array.isArray(definition.compatibility)
  // The Models library model it draws, when the library has it: its preview turns it.
  const modelId = libraryModelId(definition)
  const previewed =
    modelId && library?.some((model) => model.id === modelId) ? modelId : null
  return (
    <AppDialog title={definition.name} onClose={onClose}>
      <FieldGroup>
        <FieldGroup className="grid grid-cols-2 gap-3">
          <NameField
            name={definition.name}
            maxLength={FIXTURE_NAME_LIMIT}
            onRename={(typed) => {
              const next = normalizeText(typed)
              if (!next) return fail(t("common.enterName"))
              update({ name: next })
              return ok(next)
            }}
          />
          <Field>
            <FieldLabel htmlFor={`fixture-kind-${definition.id}`}>
              {t("fixture.type")}
            </FieldLabel>
            <OptionSelect
              options={FIXTURE_KINDS.map((kind) => ({
                value: kind,
                label: fixtureKindLabel(t, kind),
              }))}
              value={definition.kind}
              onValueChange={(value) => update({ kind: value })}
              id={`fixture-kind-${definition.id}`}
              aria-label={t("fixture.typeAria")}
              className="w-full"
            />
          </Field>
          <Field>
            <FieldLabel htmlFor={`fixture-material-${definition.id}`}>
              <Hint text={t("fixture.materialHint")}>
                {t("fixture.material")}
              </Hint>
            </FieldLabel>
            <OptionSelect
              options={materialOptions(t)}
              value={definition.material ?? AUTOMATIC}
              onValueChange={(value) =>
                update({ material: value === AUTOMATIC ? undefined : value })
              }
              id={`fixture-material-${definition.id}`}
              aria-label={t("fixture.materialAria")}
              aria-description={t("fixture.materialHint")}
              className="w-full"
            />
          </Field>
          <ColorField
            id={`fixture-color-${definition.id}`}
            label={t("fixture.colour")}
            value={definition.color}
            onChange={(color) => update({ color })}
          />
        </FieldGroup>
        <FieldSet>
          <FieldLegend>{t("fixture.compatibleMachines")}</FieldLegend>
          <FieldGroup className="gap-3">
            <Field orientation="horizontal">
              <Checkbox
                id={`fixture-compatible-all-${id}`}
                checked={allMachines}
                onCheckedChange={(checked) => {
                  if (checked) update({ compatibility: "all" })
                }}
              />
              <FieldLabel htmlFor={`fixture-compatible-all-${id}`}>
                {t("fixture.allMachines")}
              </FieldLabel>
            </Field>
            {FIXTURE_MACHINE_TYPES.map((machine) => (
              <Field key={machine.id} orientation="horizontal">
                <Checkbox
                  id={`fixture-compatible-${machine.id}-${id}`}
                  checked={machines.includes(machine.id)}
                  onCheckedChange={(checked) => {
                    const next = checked
                      ? [...machines, machine.id]
                      : machines.filter((item) => item !== machine.id)
                    update({ compatibility: next.length ? next : "all" })
                  }}
                />
                <FieldLabel htmlFor={`fixture-compatible-${machine.id}-${id}`}>
                  {machine.label}
                </FieldLabel>
              </Field>
            ))}
          </FieldGroup>
        </FieldSet>
        {bedSetup && (
          <>
            <Field orientation="horizontal">
              <Switch
                id={`fixture-default-enabled-${definition.id}`}
                checked={definition.defaultEnabled}
                onCheckedChange={(checked) =>
                  update({
                    defaultEnabled: checked,
                  })
                }
              />
              <FieldLabel htmlFor={`fixture-default-enabled-${definition.id}`}>
                {t("fixture.enabledOnNewPlates")}
              </FieldLabel>
            </Field>
            <DefaultPositionFields definition={definition} onChange={update} />
            <PointFieldSet
              label={t("fixture.defaultRotation")}
              unit="°"
              value={definition.defaultRotation}
              onChange={(defaultRotation) => update({ defaultRotation })}
            />
          </>
        )}
        <FixtureModelField
          definition={definition}
          onChange={(model) => update({ model })}
          onModels={() => openDialog({ kind: "models", back: dialog })}
        />
        {previewed && definition.model && (
          <FixtureOrientationField
            name={definition.name}
            color={definition.color}
            finish={definitionFinish(definition)}
            model={definition.model}
            modelId={previewed}
            onChange={(model) =>
              // It stands on the face chosen: only a turn about Z remains.
              update({
                model,
                defaultRotation: [0, 0, definition.defaultRotation[2]],
              })
            }
          />
        )}
        {definition.model?.source.kind === "box" && (
          <BoxSizeFields
            definition={definition}
            model={definition.model}
            onChange={(model) => update({ model })}
          />
        )}
        {definition.model && (
          <MountPointsField
            model={definition.model}
            onChange={(model) => update({ model })}
          />
        )}
      </FieldGroup>
    </AppDialog>
  )
}
