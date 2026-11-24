import type { UiResources } from "../en"
import { frJob } from "./job"
import { frMenu } from "./menu"
import { frPrepare } from "./prepare"
import { frSettings } from "./settings"
import { frShell } from "./shell"

/** Every string the interface shows in French; typed as the English shape so no key can be missed. */
export const frResources: UiResources = {
  settings: frSettings,
  menu: frMenu,
  shell: frShell,
  job: frJob,
  prepare: frPrepare,
}
