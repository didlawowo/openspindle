import type { TFunction } from "i18next"
import type { Operation } from "@/domain/operations/operation"
import { strategyLabel } from "@/domain/probing/strategies"

/**
 * A strategy's label and description in the interface's language. They live in the pure
 * domain in English; the `probing` namespace translates them by id, with the domain's
 * English as `defaultValue` where a key is missing.
 */
export const strategyLabelFor = (
  t: TFunction<"probing">,
  strategy: { id: string; label: string }
): string =>
  t(`strategies.${strategy.id}.label`, { defaultValue: strategy.label })

export const strategyDescriptionFor = (
  t: TFunction<"probing">,
  strategy: { id: string; description: string }
): string =>
  t(`strategies.${strategy.id}.description`, {
    defaultValue: strategy.description,
  })

/**
 * An operation's name as it is shown: its strategy's translated label while the name is
 * still the strategy's default, its stored name once the user has renamed it.
 */
export function operationDisplayName(
  t: TFunction<"probing">,
  operation: Operation
): string {
  const { source } = operation
  if (
    source.kind === "probing" &&
    operation.name === strategyLabel(source.strategy)
  )
    return t(`strategies.${source.strategy}.label`, {
      defaultValue: operation.name,
    })
  return operation.name
}
