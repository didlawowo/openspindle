import { useTranslation } from "react-i18next"
import { kindOf } from "@/domain/operations/kinds"
import type { Operation } from "@/domain/operations/operation"
import { probingLabel } from "@/domain/probing/strategies"
import { strategyLabelFor } from "@/features/probing/strategy-copy"

/**
 * What kind of operation this is: a probing operation goes by its strategy, the others by their
 * kind's label. The stored English label, as the job's run stages show it; the inspector shows
 * the translated one (`useOperationKindLabel`).
 */
export function operationKindLabel(operation: Operation): string {
  const { source } = operation
  if (source.kind === "probing") return probingLabel({ source })
  return kindOf(operation).label
}

export function useOperationKindLabel(operation: Operation): string {
  const { t } = useTranslation("probing")
  const { source } = operation
  if (source.kind === "probing")
    return strategyLabelFor(t, {
      id: source.strategy,
      label: probingLabel({ source }),
    })
  return kindOf(operation).label
}
