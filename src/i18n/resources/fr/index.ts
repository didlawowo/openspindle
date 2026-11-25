import type { UiResources } from "../en"
import { frCommon } from "./common"
import { frDevice } from "./device"
import { frFusion360 } from "./fusion360"
import { frJob } from "./job"
import { frMenu } from "./menu"
import { frModels } from "./models"
import { frPcb } from "./pcb"
import { frPrepare } from "./prepare"
import { frProbing } from "./probing"
import { frSettings } from "./settings"
import { frShell } from "./shell"
import { frTools } from "./tools"
import { frViewer } from "./viewer"

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
  common: frCommon,
  fusion360: frFusion360,
  models: frModels,
  tools: frTools,
  viewer: frViewer,
}
