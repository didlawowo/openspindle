import { Lock, LockOpen, Move } from "lucide-react"
import { useTranslation } from "react-i18next"
import { ToolbarToggle } from "@/components/workspace/toolbar-button"
import { useWorkspaceStore } from "@/app/workspace/workspace-context"
import { setMoving, useArrange, useArrangeTarget } from "./arrange-state"
import type { ArrangeTarget } from "./arrange-state"
import { lockToggleCopy, toggleLock } from "./use-arrange-events"

/** Tools for the setup item selected in the viewer: move it, lock it. */
export function ArrangeTools() {
  const { t } = useTranslation("prepare")
  const workspace = useWorkspaceStore()
  const target = useArrangeTarget()
  const { moving } = useArrange()
  const moveReason = target ? target.item.fixed : t("arrange.selectToMove")
  const locked = target?.item.locked === true
  const lock = lockToggleCopy(t, locked)
  const lockReason = (chosen: ArrangeTarget | null) => {
    if (!chosen) return t("arrange.selectToLock")
    if (chosen.item.locked !== null) return null
    if (chosen.item.fixed) return chosen.item.fixed
    return t("arrange.onlyFixturesLock")
  }
  return (
    <>
      <ToolbarToggle
        label={t("arrange.moveLabel")}
        description={t("arrange.moveDescription")}
        reason={moveReason}
        pressed={moving && moveReason === null}
        onPressedChange={setMoving}
      >
        <Move />
      </ToolbarToggle>
      <ToolbarToggle
        label={t("arrange.lockLabel", { label: lock.label })}
        description={lock.description}
        reason={lockReason(target)}
        pressed={locked}
        onPressedChange={() => {
          if (target) toggleLock(workspace, target)
        }}
      >
        {locked ? <Lock /> : <LockOpen />}
      </ToolbarToggle>
    </>
  )
}
