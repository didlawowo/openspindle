import { enCommon } from "./common"
import { enDevice } from "./device"
import { enFusion360 } from "./fusion360"
import { enJob } from "./job"
import { enMenu } from "./menu"
import { enModels } from "./models"
import { enPcb } from "./pcb"
import { enPrepare } from "./prepare"
import { enProbing } from "./probing"
import { enSettings } from "./settings"
import { enShell } from "./shell"
import { enTools } from "./tools"
import { enViewer } from "./viewer"

/**
 * Every string the interface shows in English, the language the app falls back to.
 * French sits beside it in ../fr, typed as this object's shape so a missing key fails
 * the typecheck. There is one module per i18next namespace, each covering one area of
 * the app: `settings` for the settings dialog and its pages, `menu` for the native
 * application menus the main process builds. New areas add their own module here.
 */
export const enResources = {
  settings: enSettings,
  menu: enMenu,
  shell: enShell,
  job: enJob,
  prepare: enPrepare,
  probing: enProbing,
  device: enDevice,
  pcb: enPcb,
  common: enCommon,
  fusion360: enFusion360,
  models: enModels,
  tools: enTools,
  viewer: enViewer,
}

export type UiResources = typeof enResources
