import type { ReactNode } from "react"
import { useTranslation } from "react-i18next"
import { cn } from "cn"

/**
 * A problem and what resolves it, as lists of problems show them: "Problem: …", then
 * "Suggested: …" under it. `action` carries the suggestion out, beside it.
 */
export function ProblemText({
  problem,
  suggestion,
  action,
  className,
}: {
  problem: string
  suggestion: string
  action?: ReactNode
  className?: string
}) {
  const { t } = useTranslation("common")
  return (
    <div className={cn("flex flex-col gap-0.5", className)}>
      <div>
        <span className="font-medium">{t("problemText.problem")}</span>{" "}
        {problem}
      </div>
      <div className="flex items-baseline justify-between gap-2">
        <div>
          <span className="font-medium">{t("problemText.suggested")}</span>{" "}
          {suggestion}
        </div>
        {action}
      </div>
    </div>
  )
}
