import { enDevice } from "./device"
import { enJob } from "./job"
import { enMenu } from "./menu"
import { enPrepare } from "./prepare"
import { enSettings } from "./settings"
import { enShell } from "./shell"

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
  device: enDevice,
}

export type UiResources = typeof enResources
