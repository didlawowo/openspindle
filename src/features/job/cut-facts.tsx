import { useTranslation } from "react-i18next"
import { useWorkspace } from "@/app/workspace/workspace-context"
import { lineCut } from "@/domain/tools/cut-engagement"
import type { LineCut, LineCutKind } from "@/domain/tools/cut-engagement"
import type { Tool } from "@/domain/tools/tool"
import { HeightMapFacts } from "@/components/workspace/height-map-grid"
import type { JobT, JobSubject } from "./job-view"
import type { CutPrediction } from "./use-cut-prediction"
import type { CursorTool } from "./use-job-timeline"

const millimetres = (value: number) => `${value.toFixed(3)} mm`

/** The depth of cut of a line that removes nothing, by what it does instead. */
const NOT_CUTTING: Record<Exclude<LineCutKind, "cut">, string> = {
  none: "—",
  rapid: "cut.rapid",
  probe: "cut.probe",
  air: "cut.air",
  unknown: "cut.unknownShape",
}

/**
 * "T2 · name" for the tool in the spindle, as the plate's tool table names it: the tool the 3D
 * view draws at the timeline's cursor.
 */
function toolText(
  subject: JobSubject,
  tools: readonly Tool[],
  tool: CursorTool | null
): string {
  if (!tool) return "—"
  const { number } = tool
  const toolId = subject.plate.tools.find(
    (entry) => entry.number === number
  )?.toolId
  const name = tools.find((item) => item.id === toolId)?.name
  return (
    [number === null ? null : `T${number}`, name]
      .filter((part) => !!part)
      .join(" · ") || "—"
  )
}

/** The facts' values for a line, or what stands in for them before they are known. */
function cutValues(prediction: CutPrediction | null, line: number, t: JobT) {
  if (!prediction || line <= 0) return { depth: "—", width: "—", below: "—" }
  if (prediction.status === "calculating") {
    const calculating = t("cut.calculating")
    return { depth: calculating, width: calculating, below: "—" }
  }
  if (prediction.status === "failed") {
    const unavailable = t("cut.unavailable")
    return { depth: unavailable, width: unavailable, below: "—" }
  }
  const cut: LineCut = lineCut(prediction.engagement, line)
  return {
    depth:
      cut.kind === "cut"
        ? millimetres(cut.depth)
        : cut.kind === "none"
          ? "—"
          : t(NOT_CUTTING[cut.kind], { defaultValue: NOT_CUTTING[cut.kind] }),
    width: cut.kind === "cut" ? millimetres(cut.width) : "—",
    below:
      cut.belowTop !== null && cut.belowTop > 0.0005
        ? millimetres(cut.belowTop)
        : "—",
  }
}

/**
 * The cut at the timeline's line: the tool in the spindle, the depth and width of cut the
 * sweep of the stock predicts for the line's moves, and how far below the stock top they
 * leave the tool's tip.
 */
export function CutFacts({
  subject,
  prediction,
  line,
  tool: shown,
}: {
  subject: JobSubject | null
  prediction: CutPrediction | null
  /** The line on show; 0 while the whole program shows. */
  line: number
  /** The tool in the spindle at the timeline's cursor; null while none shows. */
  tool: CursorTool | null
}) {
  const { t } = useTranslation("job")
  const library = useWorkspace((state) => state.tools)
  const tools = subject?.tools ?? library
  const values = cutValues(prediction, line, t)
  const tool = subject ? toolText(subject, tools, shown) : "—"
  return (
    <HeightMapFacts
      facts={[
        {
          label: t("cut.tool"),
          value: (
            <span className="block truncate" title={tool}>
              {tool}
            </span>
          ),
        },
        { label: t("cut.depth"), value: values.depth },
        { label: t("cut.width"), value: values.width },
        { label: t("cut.below"), value: values.below },
      ]}
    />
  )
}
