import { useTranslation } from "react-i18next"
import { ChevronDown, Plus, RotateCcw, Trash2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { FieldDescription, FieldGroup, FieldSet } from "@/components/ui/field"
import { NameField } from "@/components/name-field"
import { PointFields } from "@/components/workspace/coordinate-input"
import { newId, normalizeText, ok, fail } from "@/domain/primitives"
import { fixtureModelMountPoints } from "@/domain/fixtures/catalog"
import type { FixtureModel } from "@/domain/fixtures/definitions"
import { MOUNT_POINT_LIMIT } from "@/domain/fixtures/mount-points"
import type { MountPoint } from "@/domain/fixtures/mount-points"

/**
 * The points a fixture mounts and lines up by, in its frame: moves in the 3D view snap to
 * them, and to the points of everything else on the bed.
 */
export function MountPointsField({
  model,
  onChange,
}: {
  model: FixtureModel
  onChange: (model: FixtureModel) => void
}) {
  const { t } = useTranslation("device")
  const sourceNote = () => {
    if (model.mountPoints) return t("mountPoints.sourceDefined")
    if (model.source.kind === "bundled") return t("mountPoints.sourceBundled")
    return t("mountPoints.sourceBox")
  }
  const points = fixtureModelMountPoints(model)
  const save = (next: MountPoint[]) => onChange({ ...model, mountPoints: next })
  const change = (id: string, patch: Partial<MountPoint>) =>
    save(
      points.map((point) => (point.id === id ? { ...point, ...patch } : point))
    )
  return (
    <Collapsible>
      <CollapsibleTrigger
        render={
          <Button variant="ghost" className="w-full justify-start px-0" />
        }
      >
        <span className="min-w-0 flex-1 truncate text-left">
          {t("mountPoints.title")}
        </span>
        <Badge variant="secondary" className="font-numeric">
          {points.length}
        </Badge>
        <ChevronDown data-icon="inline-end" />
      </CollapsibleTrigger>
      <CollapsibleContent className="pt-3">
        <FieldGroup className="gap-4">
          <FieldDescription>
            {t("mountPoints.hint")} {sourceNote()}
          </FieldDescription>
          {points.map((point) => (
            <FieldSet
              key={point.id}
              aria-label={t("mountPoints.pointAria", { name: point.name })}
            >
              <div className="flex items-center gap-2">
                <div className="min-w-0 flex-1">
                  <NameField
                    name={point.name}
                    label={t("mountPoints.pointName")}
                    hideLabel
                    onRename={(typed) => {
                      const next = normalizeText(typed)
                      if (!next) return fail(t("mountPoints.nameRequired"))
                      change(point.id, { name: next })
                      return ok(next)
                    }}
                  />
                </div>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={t("mountPoints.removePoint", {
                    name: point.name,
                  })}
                  onClick={() =>
                    save(points.filter(({ id }) => id !== point.id))
                  }
                >
                  <Trash2 />
                </Button>
              </div>
              <PointFields
                label={point.name}
                value={point.position}
                onChange={(position) => change(point.id, { position })}
              />
            </FieldSet>
          ))}
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={points.length >= MOUNT_POINT_LIMIT}
              onClick={() =>
                save([
                  ...points,
                  {
                    id: newId(),
                    name: t("mountPoints.newPoint", {
                      number: points.length + 1,
                    }),
                    position: [0, 0, 0],
                  },
                ])
              }
            >
              <Plus data-icon="inline-start" />
              {t("mountPoints.addPoint")}
            </Button>
            {model.mountPoints && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  const { mountPoints: _defined, ...rest } = model
                  onChange(rest)
                }}
              >
                <RotateCcw data-icon="inline-start" />
                {t("mountPoints.useModelPoints")}
              </Button>
            )}
          </div>
        </FieldGroup>
      </CollapsibleContent>
    </Collapsible>
  )
}
