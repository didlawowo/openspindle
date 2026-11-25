import type { ReactNode } from "react"
import { useTranslation } from "react-i18next"
import { Badge } from "@/components/ui/badge"
import { FieldDescription } from "@/components/ui/field"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  formatHeight,
  heightStatistics,
} from "@/domain/probing/tasks/grid/analysis"
import type { GridPosition } from "@/domain/probing/tasks/grid/analysis"
import type { HeightMap } from "@/machine/contract"
import { cn } from "@/lib/utils"

/** Translucent tints, so values stay readable on light and dark themes alike. */
const BELOW = [
  "bg-blue-500/5",
  "bg-blue-500/15",
  "bg-blue-500/25",
  "bg-blue-500/35",
  "bg-blue-500/50",
] as const
const ABOVE = [
  "bg-amber-500/5",
  "bg-amber-500/15",
  "bg-amber-500/25",
  "bg-amber-500/35",
  "bg-amber-500/50",
] as const

function heightColor(height: number | null, scale: number) {
  if (height === null) return "bg-muted text-muted-foreground"
  const intensity = Math.min(4, Math.round((4 * Math.abs(height)) / scale))
  return (height < 0 ? BELOW : ABOVE)[intensity]
}

/**
 * Labelled values of a height map, such as its grid size and height range, at the size of a
 * card's text wherever they show.
 */
export function HeightMapFacts({
  facts,
}: {
  facts: ReadonlyArray<{ label: string; value: ReactNode }>
}) {
  return (
    <dl className="grid grid-cols-2 gap-4 text-xs/relaxed sm:grid-cols-4 [&_dd]:font-numeric [&_dt]:mb-1 [&_dt]:text-muted-foreground">
      {facts.map(({ label, value }) => (
        <div key={label}>
          <dt className="text-[0.65rem] text-muted-foreground uppercase">
            {label}
          </dt>
          <dd className="text-sm font-medium tabular-nums">{value}</dd>
        </div>
      ))}
    </dl>
  )
}

/**
 * Colour-coded measured heights in the device's reported order; outliers show as red badges.
 * Compact, for a card: hundredths of a millimetre in narrower cells, the axes without captions.
 */
export function HeightMapGrid({
  map,
  outliers = [],
  compact = false,
}: {
  map: HeightMap
  outliers?: readonly GridPosition[]
  compact?: boolean
}) {
  const { t } = useTranslation("common")
  const statistics = heightStatistics(map.heights)
  const scale = Math.max(
    Math.abs(statistics?.min ?? 0),
    Math.abs(statistics?.max ?? 0),
    0.0001
  )
  const axes =
    map.xCoordinates && map.yCoordinates
      ? { x: map.xCoordinates, y: map.yCoordinates }
      : null
  const index = ({ row, column }: GridPosition) => row * map.columns + column
  const outlying = new Set(outliers.map(index))
  const axisLabel = (value: number) =>
    compact ? Number(value.toFixed(1)) : value
  const format = (height: number) =>
    compact
      ? `${height > 0 ? "+" : ""}${height.toFixed(2)}`
      : formatHeight(height)
  return (
    <>
      <FieldDescription
        className={cn(
          "flex flex-wrap justify-between gap-2 py-3",
          compact && "hidden"
        )}
      >
        <span>{t("heightMap.relativeHeight")}</span>
        <span>{axes ? t("heightMap.offsets") : t("heightMap.indices")}</span>
      </FieldDescription>
      <div
        className="max-h-[440px] overflow-auto [&>[data-slot=table-container]]:overflow-visible"
        tabIndex={0}
        aria-label={t("heightMap.region")}
      >
        <Table
          className={cn(
            "border-separate border-spacing-0.5 font-numeric [&_td]:text-center [&_th]:sticky [&_th]:top-0 [&_th]:z-10 [&_th]:bg-background [&_th:first-child]:left-0",
            compact ? "[&_td]:min-w-10 [&_td]:px-1" : "[&_td]:min-w-16"
          )}
        >
          <TableHeader>
            <TableRow>
              <TableHead>
                {axes ? t("heightMap.axes") : t("heightMap.rowCol")}
              </TableHead>
              {Array.from({ length: map.columns }, (_, column) => (
                <TableHead key={column} scope="col">
                  {axes ? axisLabel(axes.x[column]) : column + 1}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {map.heights.map((values, row) => (
              <TableRow key={row}>
                <TableHead scope="row">
                  {axes ? axisLabel(axes.y[row]) : row + 1}
                </TableHead>
                {values.map((height, column) => {
                  const outlier = outlying.has(index({ row, column }))
                  const position = axes
                    ? t("heightMap.positionAxes", {
                        x: axes.x[column],
                        y: axes.y[row],
                      })
                    : t("heightMap.positionIndex", {
                        row: row + 1,
                        column: column + 1,
                      })
                  const text = height === null ? "—" : format(height)
                  const value =
                    height === null ? t("heightMap.unmeasured") : `${text} mm`
                  return (
                    <TableCell
                      key={column}
                      data-unmeasured={height === null || undefined}
                      data-outlier={outlier || undefined}
                      title={`${t("heightMap.cellTitle", { position, value })}${outlier ? t("heightMap.outlierSuffix") : ""}`}
                      className={heightColor(height, scale)}
                    >
                      {outlier ? (
                        <Badge variant="destructive">{text}</Badge>
                      ) : (
                        text
                      )}
                    </TableCell>
                  )
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <FieldDescription className="flex flex-wrap justify-between gap-2 py-3">
        <span>
          {t("heightMap.legend")}
          {outliers.length > 0 && t("heightMap.legendOutlier")}
        </span>
        <span className="font-numeric">
          {t("heightMap.measured", {
            measured: statistics?.count ?? 0,
            total: map.columns * map.rows,
          })}
        </span>
      </FieldDescription>
    </>
  )
}
