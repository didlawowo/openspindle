import { useId } from "react"
import type { ComponentProps } from "react"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

/**
 * A button that explains why it is unavailable. Disabled buttons receive no
 * pointer or focus events, so the reason lives on a focusable wrapper.
 */
export function ReasonButton({
  label,
  reason,
  disabled,
  ...props
}: ComponentProps<typeof Button> & {
  /** Accessible name of the action, used when it is unavailable. */
  label: string
  reason: string | null
}) {
  const { t } = useTranslation("common")
  const reasonId = useId()
  const button = (
    <Button
      {...props}
      disabled={disabled || reason !== null}
      aria-describedby={reason ? reasonId : undefined}
    />
  )
  if (!reason) return button
  return (
    <Tooltip>
      <TooltipTrigger
        delay={200}
        closeOnClick={false}
        render={
          <span
            className="inline-flex"
            role="group"
            aria-label={t("unavailable", { label })}
            aria-describedby={reasonId}
            tabIndex={0}
          />
        }
      >
        {button}
      </TooltipTrigger>
      <TooltipContent id={reasonId} side="bottom" sideOffset={8}>
        {reason}
      </TooltipContent>
    </Tooltip>
  )
}
