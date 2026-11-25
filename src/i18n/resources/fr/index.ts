import type { UiResources } from "../en"
import { frDevice } from "./device"
import { frJob } from "./job"
import { frMenu } from "./menu"
import { frPcb } from "./pcb"
import { frPrepare } from "./prepare"
import { frProbing } from "./probing"
import { frSettings } from "./settings"
import { frShell } from "./shell"

/** Every string the interface shows in French; typed as the English shape so no key can be missed. */
export const frResources: UiResources = {
  settings: frSettings,
  menu: frMenu,
  shell: frShell,
  job: frJob,
  prepare: frPrepare,
  probing: frProbing,
  device: frDevice,
  pcb: frPcb,
}
