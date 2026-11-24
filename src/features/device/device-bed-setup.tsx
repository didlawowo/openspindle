import { useTranslation } from "react-i18next"
import type { TFunction } from "i18next"
import { LayoutTemplate, LocateFixed, Plus, Trash2, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field"
import { NameField } from "@/components/name-field"
import { OptionSelect } from "@/components/option-select"
import { CoordinateInput } from "@/components/workspace/coordinate-input"
import { Hint } from "@/components/workspace/hint"
import { ReasonButton } from "@/components/workspace/reason-button"
import {
  BED_SETUP_ANCHOR_LIMIT,
  deviceAnchorsOf,
} from "@/domain/anchors/stored-anchors"
import type {
  AnchorXY,
  BedSetupAnchor,
  StoredAnchorSetup,
} from "@/domain/anchors/stored-anchors"
import { BED_SETUP_LIMIT } from "@/domain/fixtures/profiles"
import type { BedSetup, FixtureProfiles } from "@/domain/fixtures/profiles"
import { fail, normalizeText, ok, toMicrometre } from "@/domain/primitives"

type DeviceT = TFunction<"device">

/** "Anchor N" with the first number from `first` that no anchor's name has. */
function nextAnchorName(
  first: number,
  anchors: readonly { readonly name: string }[],
  t: DeviceT
) {
  const names = new Set(anchors.map((anchor) => anchor.name))
  let number = first
  while (names.has(t("bedSetup.anchorName", { number }))) number += 1
  return t("bedSetup.anchorName", { number })
}

/**
 * The project's device, and the bed setup of it whose fixture defaults it edits:
 * adding one (a copy of the shown one), naming, removing and making it the default for new
 * plates, and the anchors it keeps, each typed as X and Y from the device's first anchor or
 * taken from where the machine is.
 */
export function DeviceBedSetup({
  profiles,
  selectedId,
  onProfileChange,
  bedSetups,
  bedSetup,
  defaultBedSetupId,
  onBedSetupChange,
  deviceAnchors,
  current,
  onAdd,
  onRename,
  onRemove,
  onMakeDefault,
  onAnchorsChange,
}: {
  profiles: FixtureProfiles
  selectedId: string
  onProfileChange: (id: string) => void
  bedSetups: readonly BedSetup[]
  /** The bed setup shown. */
  bedSetup: BedSetup
  defaultBedSetupId: string
  onBedSetupChange: (id: string) => void
  /** The device's anchors; without them the bed setup keeps no anchors. */
  deviceAnchors: StoredAnchorSetup | undefined
  /** Where the machine is from the first anchor, to take as an anchor's; why not, otherwise. */
  current: { position: AnchorXY } | { reason: string }
  onAdd: () => void
  onRename: (name: string) => void
  onRemove: () => void
  onMakeDefault: () => void
  onAnchorsChange: (anchors: BedSetupAnchor[]) => void
}) {
  const { t } = useTranslation("device")
  const available = Object.hasOwn(profiles, selectedId)
  const device = deviceAnchors ? deviceAnchorsOf(deviceAnchors) : []
  const first = device.at(0)
  const { anchors } = bedSetup
  const place = (id: string, change: Partial<BedSetupAnchor>) =>
    onAnchorsChange(
      anchors.map((anchor) =>
        anchor.id === id ? { ...anchor, ...change } : anchor
      )
    )
  const here =
    "position" in current
      ? ([
          toMicrometre(current.position[0]),
          toMicrometre(current.position[1]),
        ] as AnchorXY)
      : null
  const reason = "reason" in current ? current.reason : null
  return (
    <Card size="sm" role="region" aria-label={t("bedSetup.region")}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <LayoutTemplate className="size-4" />
          <Hint text={t("bedSetup.hint")}>{t("bedSetup.title")}</Hint>
        </CardTitle>
        {available && (
          <CardAction className="flex gap-1">
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={t("bedSetup.add")}
              title={t("bedSetup.add")}
              disabled={bedSetups.length >= BED_SETUP_LIMIT}
              onClick={onAdd}
            >
              <Plus />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={t("bedSetup.remove", { name: bedSetup.name })}
              title={t("bedSetup.remove", { name: bedSetup.name })}
              disabled={bedSetups.length <= 1}
              onClick={onRemove}
            >
              <Trash2 />
            </Button>
          </CardAction>
        )}
      </CardHeader>
      <CardContent>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="fixture-library-device">
              {t("bedSetup.device")}
            </FieldLabel>
            <OptionSelect
              id="fixture-library-device"
              aria-label={t("bedSetup.deviceAria")}
              className="w-full"
              options={[
                ...(!available
                  ? [
                      {
                        value: selectedId,
                        label: t("bedSetup.notOnComputer", { id: selectedId }),
                        disabled: true,
                      },
                    ]
                  : []),
                ...Object.entries(profiles).map(([id, profile]) => ({
                  value: id,
                  label: profile.name,
                })),
              ]}
              value={selectedId}
              onValueChange={onProfileChange}
            />
          </Field>
          {available && (
            <>
              <Field>
                <FieldLabel htmlFor="device-bed-setup">
                  {t("bedSetup.title")}
                </FieldLabel>
                <OptionSelect
                  id="device-bed-setup"
                  className="w-full"
                  options={bedSetups.map((setup) => ({
                    value: setup.id,
                    label: setup.name,
                  }))}
                  value={bedSetup.id}
                  onValueChange={onBedSetupChange}
                />
              </Field>
              <NameField
                name={bedSetup.name}
                onRename={(typed) => {
                  const next = normalizeText(typed)
                  if (!next) return fail(t("common.enterName"))
                  onRename(next)
                  return ok(next)
                }}
              />
              <Field orientation="horizontal">
                <Checkbox
                  id="device-bed-setup-default"
                  checked={bedSetup.id === defaultBedSetupId}
                  disabled={bedSetup.id === defaultBedSetupId}
                  aria-description={t("bedSetup.defaultHint")}
                  onCheckedChange={(checked) => {
                    if (checked) onMakeDefault()
                  }}
                />
                <FieldLabel htmlFor="device-bed-setup-default">
                  <Hint text={t("bedSetup.defaultHint")}>
                    {t("bedSetup.default")}
                  </Hint>
                </FieldLabel>
              </Field>
              {first && (
                <FieldSet>
                  <FieldLegend className="flex w-full items-center justify-between">
                    <Hint text={t("bedSetup.anchorsHint")}>
                      {t("bedSetup.anchorsFrom", { name: first.name })}
                    </Hint>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={t("bedSetup.addAnchor")}
                      title={t("bedSetup.addAnchor")}
                      disabled={anchors.length >= BED_SETUP_ANCHOR_LIMIT}
                      onClick={() =>
                        onAnchorsChange([
                          ...anchors,
                          {
                            id: crypto.randomUUID(),
                            name: nextAnchorName(
                              device.length + 1,
                              [...device, ...anchors],
                              t
                            ),
                            offset: here ?? [0, 0],
                          },
                        ])
                      }
                    >
                      <Plus />
                    </Button>
                  </FieldLegend>
                  {anchors.map((anchor) => (
                    <FieldGroup
                      key={anchor.id}
                      className="grid grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)_auto_auto] items-end gap-2"
                    >
                      <NameField
                        name={anchor.name}
                        label={t("bedSetup.anchorNameLabel")}
                        hideLabel
                        onRename={(typed) => {
                          const next = normalizeText(typed)
                          if (!next) return fail(t("common.enterName"))
                          place(anchor.id, { name: next })
                          return ok(next)
                        }}
                      />
                      <CoordinateInput
                        axis="X"
                        unit="mm"
                        label={t("bedSetup.anchorX", {
                          name: anchor.name,
                          from: first.name,
                        })}
                        value={anchor.offset[0]}
                        onCommit={(value) =>
                          place(anchor.id, {
                            offset: [value, anchor.offset[1]],
                          })
                        }
                      />
                      <CoordinateInput
                        axis="Y"
                        unit="mm"
                        label={t("bedSetup.anchorY", {
                          name: anchor.name,
                          from: first.name,
                        })}
                        value={anchor.offset[1]}
                        onCommit={(value) =>
                          place(anchor.id, {
                            offset: [anchor.offset[0], value],
                          })
                        }
                      />
                      <ReasonButton
                        label={t("anchors.useCurrent", { name: anchor.name })}
                        variant="outline"
                        size="icon"
                        aria-label={t("anchors.useCurrent", {
                          name: anchor.name,
                        })}
                        title={t("anchors.useCurrent", { name: anchor.name })}
                        reason={reason}
                        onClick={() => {
                          if (here) place(anchor.id, { offset: here })
                        }}
                      >
                        <LocateFixed />
                      </ReasonButton>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={t("bedSetup.remove", { name: anchor.name })}
                        title={t("bedSetup.remove", { name: anchor.name })}
                        onClick={() =>
                          onAnchorsChange(
                            anchors.filter((item) => item.id !== anchor.id)
                          )
                        }
                      >
                        <X />
                      </Button>
                    </FieldGroup>
                  ))}
                </FieldSet>
              )}
            </>
          )}
        </FieldGroup>
      </CardContent>
    </Card>
  )
}
