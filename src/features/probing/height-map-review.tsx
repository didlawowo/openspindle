import { useMemo } from "react"
import { CircleAlert, CircleCheck, Grid3X3, TriangleAlert } from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { useTranslation } from "react-i18next"
import type { TFunction } from "i18next"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { FieldError } from "@/components/ui/field"
import { Spinner } from "@/components/ui/spinner"
import { ReasonButton } from "@/components/workspace/reason-button"
import {
  analyzeHeightMap,
  formatHeight,
  formatSpan,
} from "@/domain/probing/tasks/grid/analysis"
import type {
  FlatnessVerdict,
  GridSize,
  HeightMapAnalysis,
} from "@/domain/probing/tasks/grid/analysis"
import type { HeightMap } from "@/machine/contract"
import {
  HeightMapFacts,
  HeightMapGrid,
} from "@/components/workspace/height-map-grid"

export type HeightMapReviewProps = {
  /** The map read at the review pause; undefined until a read succeeds. */
  map?: HeightMap
  /** The grid the paused operation probed, when known. */
  expected?: GridSize
  /** A height-map read (M375.1) is in progress. */
  reading: boolean
  /** Why the latest read failed; null after a successful read. */
  readError: string | null
  onRetryRead: () => void
  /** Why reading again is unavailable; null enables it. */
  retryReadDisabledReason: string | null
}

const VERDICTS: Record<
  FlatnessVerdict,
  {
    key: "review.flat" | "review.uneven" | "review.unreliable"
    variant: "default" | "destructive"
    icon: LucideIcon
  }
> = {
  flat: { key: "review.flat", variant: "default", icon: CircleCheck },
  uneven: { key: "review.uneven", variant: "default", icon: TriangleAlert },
  unreliable: {
    key: "review.unreliable",
    variant: "destructive",
    icon: CircleAlert,
  },
}

const millimetres = (
  value: number | undefined,
  format: (value: number) => string
) => (value === undefined ? "—" : `${format(value)} mm`)

function reviewFacts(
  t: TFunction<"probing">,
  {
    size,
    expected,
    sizeMatches,
    samples,
    statistics,
    outliers,
    surface,
  }: HeightMapAnalysis
) {
  const mismatch =
    sizeMatches === false && expected
      ? t("review.probedExpected", {
          columns: expected.columns,
          rows: expected.rows,
        })
      : ""
  return [
    {
      label: t("review.grid"),
      value: `${size.columns} × ${size.rows}${mismatch}`,
    },
    {
      label: t("review.measured"),
      value: `${samples.valid} / ${samples.total}`,
    },
    { label: t("review.outliers"), value: String(outliers.length) },
    {
      label: t("review.minimum"),
      value: millimetres(statistics?.min, formatHeight),
    },
    {
      label: t("review.maximum"),
      value: millimetres(statistics?.max, formatHeight),
    },
    {
      label: t("review.mean"),
      value: millimetres(statistics?.mean, formatHeight),
    },
    {
      label: t("review.range"),
      value: millimetres(statistics?.range, formatSpan),
    },
    { label: t("review.tilt"), value: millimetres(surface?.tilt, formatSpan) },
    {
      label: t("review.flatness"),
      value: millimetres(surface?.flatness, formatSpan),
    },
  ]
}

function PendingRead({
  reading,
  readError,
}: Pick<HeightMapReviewProps, "reading" | "readError">) {
  const { t } = useTranslation("probing")
  if (reading)
    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Spinner />
          </EmptyMedia>
          <EmptyTitle>{t("review.reading")}</EmptyTitle>
          <EmptyDescription>{t("review.readingHint")}</EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  if (readError)
    return (
      <Alert variant="destructive">
        <CircleAlert />
        <AlertTitle>{t("review.readFailed")}</AlertTitle>
        <AlertDescription>{readError}</AlertDescription>
      </Alert>
    )
  return (
    <Empty>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <Grid3X3 />
        </EmptyMedia>
        <EmptyTitle>{t("review.none")}</EmptyTitle>
        <EmptyDescription>{t("review.noneHint")}</EmptyDescription>
      </EmptyHeader>
    </Empty>
  )
}

function Verdict({ analysis }: { analysis: HeightMapAnalysis }) {
  const { t } = useTranslation("probing")
  const { key, variant, icon: Icon } = VERDICTS[analysis.verdict]
  return (
    <Alert variant={variant}>
      <Icon />
      <AlertTitle>{t(key)}</AlertTitle>
      <AlertDescription>
        <ul className="flex flex-col gap-1">
          {analysis.reasons.map((reason) => (
            <li key={reason.code}>{reason.message}</li>
          ))}
        </ul>
      </AlertDescription>
    </Alert>
  )
}

/**
 * Review of the measured height map while a job waits at its height map review pause; Resume
 * and Stop are the job's own controls.
 */
export function HeightMapReview({
  map,
  expected,
  reading,
  readError,
  onRetryRead,
  retryReadDisabledReason,
}: HeightMapReviewProps) {
  const { t } = useTranslation("probing")
  const columns = expected?.columns
  const rows = expected?.rows
  const analysis = useMemo(() => {
    if (!map) return null
    const size =
      columns === undefined || rows === undefined
        ? undefined
        : { columns, rows }
    return analyzeHeightMap(map, { expected: size })
  }, [map, columns, rows])
  return (
    <Card size="sm" role="region" aria-label={t("review.aria")}>
      <CardHeader>
        <CardTitle>{t("review.title")}</CardTitle>
        <CardDescription>{t("review.description")}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {map && analysis ? (
          <>
            {readError && <FieldError>{readError}</FieldError>}
            <Verdict analysis={analysis} />
            <HeightMapFacts
              facts={[
                ...reviewFacts(t, analysis),
                {
                  label: t("review.readAt"),
                  value: (
                    <time dateTime={new Date(map.receivedAt).toISOString()}>
                      {new Date(map.receivedAt).toLocaleTimeString()}
                    </time>
                  ),
                },
              ]}
            />
            <HeightMapGrid map={map} outliers={analysis.outliers} />
          </>
        ) : (
          <PendingRead reading={reading} readError={readError} />
        )}
      </CardContent>
      <CardFooter className="flex-wrap justify-end gap-2">
        <ReasonButton
          label={t("review.retryAria")}
          reason={retryReadDisabledReason}
          variant="outline"
          disabled={reading}
          onClick={onRetryRead}
        >
          {reading ? t("review.retrying") : t("review.retry")}
        </ReasonButton>
      </CardFooter>
    </Card>
  )
}
