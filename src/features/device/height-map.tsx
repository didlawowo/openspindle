import { useState } from "react"
import { useTranslation } from "react-i18next"
import { Grid3X3 } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { HeightMap } from "@/machine/contract"
import {
  Card,
  CardHeader,
  CardTitle,
  CardAction,
  CardContent,
  CardDescription,
} from "@/components/ui/card"
import { FieldDescription, FieldError } from "@/components/ui/field"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import {
  formatHeight,
  formatSpan,
  heightStatistics,
} from "@/domain/probing/tasks/grid/analysis"
import {
  HeightMapFacts,
  HeightMapGrid,
} from "@/components/workspace/height-map-grid"
import { ReasonButton } from "@/components/workspace/reason-button"
import { numberText } from "./device-format"

export function HeightMapCard({
  map,
  onOpen,
}: {
  map?: HeightMap
  onOpen: () => void
}) {
  const { t } = useTranslation("device")
  return (
    <Card
      size="sm"
      role="region"
      className="min-w-0"
      aria-label={t("heightMap.region")}
    >
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Grid3X3 size={16} />
          {t("heightMap.titleCard")}
        </CardTitle>
        <CardAction>
          <Button size="sm" variant="outline" onClick={onOpen}>
            {t("heightMap.title")}
          </Button>
        </CardAction>
      </CardHeader>
      {map && (
        <CardContent>
          <CardDescription className="font-numeric">
            {t("heightMap.pointsCount", {
              columns: map.columns,
              rows: map.rows,
            })}{" "}
            · {new Date(map.receivedAt).toLocaleTimeString()}
          </CardDescription>
        </CardContent>
      )}
    </Card>
  )
}

/** What the machine applies now, as its status reports it. */
export type AppliedHeights = {
  /** The applied map's span from lowest to highest, mm; null while it applies none. */
  readonly compensation: number | null
  /** Machine Z of work zero. */
  readonly workZ: number | null
  readonly toolOffset: number | null
}

const millimetres = (value: number | null) =>
  value === null ? "—" : `${numberText(value, 3)} mm`

export function HeightMapView({
  map,
  deviceName,
  readError,
  deferred,
  reading,
  onRetrieve,
  applied,
  clearReason,
  clearing,
  onClear,
}: {
  map?: HeightMap
  deviceName?: string
  readError: string | null
  /** The read waits until the running program ends. */
  deferred: boolean
  reading: boolean
  onRetrieve: () => Promise<void>
  /** Null while the machine does not report it. */
  applied: AppliedHeights | null
  /** Why clearing is unavailable; null enables it. */
  clearReason: string | null
  clearing: boolean
  onClear: () => void
}) {
  const { t } = useTranslation("device")
  const [error, setError] = useState("")
  const [view, setView] = useState<"map" | "source">("map")
  const statistics = map ? heightStatistics(map.heights) : null
  const retrieve = async () => {
    setError("")
    try {
      await onRetrieve()
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : t("heightMap.retrieveFailed")
      )
    }
  }
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h3>{deviceName ?? t("heightMap.noDevice")}</h3>
          {map && (
            <>
              <FieldDescription>{t("heightMap.deviceGrid")}</FieldDescription>
              <FieldDescription className="font-numeric">
                <time dateTime={new Date(map.receivedAt).toISOString()}>
                  {t("heightMap.retrieved", {
                    when: new Date(map.receivedAt).toLocaleString(),
                  })}
                </time>
              </FieldDescription>
            </>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <ReasonButton
            label={t("heightMap.clear")}
            reason={clearReason}
            variant="outline"
            disabled={clearing}
            onClick={onClear}
          >
            {clearing ? t("heightMap.clearing") : t("heightMap.clear")}
          </ReasonButton>
          <ReasonButton
            label={t("heightMap.retrieve")}
            reason={readError}
            disabled={reading}
            onClick={() => void retrieve()}
          >
            {reading
              ? t("heightMap.retrieving")
              : deferred
                ? t("heightMap.retrieveDeferred")
                : t("heightMap.retrieveCommand")}
          </ReasonButton>
        </div>
      </div>
      {applied && (
        <HeightMapFacts
          facts={[
            {
              label: t("heightMap.compensation"),
              value:
                applied.compensation === null
                  ? t("heightMap.compensationOff")
                  : t("heightMap.compensationOn", {
                      span: formatSpan(applied.compensation),
                    }),
            },
            {
              label: t("heightMap.workZ"),
              value: millimetres(applied.workZ),
            },
            {
              label: t("heightMap.toolOffset"),
              value: millimetres(applied.toolOffset),
            },
          ]}
        />
      )}
      {error && <FieldError>{error}</FieldError>}
      {!map ? (
        <FieldDescription className="py-8 text-center">
          {readError ?? t("heightMap.none")}
        </FieldDescription>
      ) : (
        <>
          <HeightMapFacts
            facts={[
              {
                label: t("heightMap.grid"),
                value: `${map.columns} × ${map.rows}`,
              },
              {
                label: t("heightMap.minimum"),
                value: statistics ? `${formatHeight(statistics.min)} mm` : "—",
              },
              {
                label: t("heightMap.maximum"),
                value: statistics ? `${formatHeight(statistics.max)} mm` : "—",
              },
              {
                label: t("heightMap.range"),
                value: statistics ? `${formatSpan(statistics.range)} mm` : "—",
              },
            ]}
          />
          <Tabs
            value={view}
            onValueChange={(value) => {
              if (value === "map" || value === "source") setView(value)
            }}
          >
            <TabsList variant="line" aria-label={t("heightMap.viewAria")}>
              <TabsTrigger value="map">{t("heightMap.titleCard")}</TabsTrigger>
              <TabsTrigger value="source">
                {t("heightMap.firmwareOutput")}
              </TabsTrigger>
            </TabsList>
            <TabsContent
              value="source"
              aria-label={t("heightMap.firmwareOutput")}
            >
              <pre className="mt-3 max-h-[440px] overflow-auto">{map.raw}</pre>
            </TabsContent>
            <TabsContent
              value="map"
              aria-label={t("heightMap.measuredMapAria")}
            >
              <HeightMapGrid map={map} />
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  )
}
