import { BrowserWindow, Menu, app, webContents } from "electron"
import type { MenuItemConstructorOptions } from "electron"
import type { TFunction } from "i18next"
import type { MenuBus } from "./services/menu-bus"

export const MACHINE_STOP_ITEM = "machine.stop"
export const UPDATE_CHECK_ITEM = "app.update.check"
export const UPDATE_INSTALL_ITEM = "app.update.install"

/**
 * Undo or Redo. In the window's page the renderer decides what it undoes: the typing of the
 * focused text field, or the edits of the section on show. The developer tools undo their
 * own typing.
 */
function historyItem(
  bus: MenuBus,
  command: "edit.undo" | "edit.redo",
  options: MenuItemConstructorOptions
): MenuItemConstructorOptions {
  return {
    ...options,
    click: (_item, window) => {
      const page = window instanceof BrowserWindow ? window.webContents : null
      const focused = webContents.getFocusedWebContents()
      if (
        focused &&
        (focused.id !== page?.id || focused.focusedFrame?.parent)
      ) {
        if (command === "edit.undo") focused.undo()
        else focused.redo()
        return
      }
      bus.emit(command)
    },
  }
}

/** The Edit menu the editMenu role makes, with the app's own Undo and Redo. */
function editMenu(
  bus: MenuBus,
  isMac: boolean,
  t: TFunction<"menu">
): MenuItemConstructorOptions {
  const extras: MenuItemConstructorOptions[] = isMac
    ? [
        { role: "pasteAndMatchStyle" },
        { role: "delete" },
        { role: "selectAll" },
        { type: "separator" },
        {
          label: t("speech"),
          submenu: [{ role: "startSpeaking" }, { role: "stopSpeaking" }],
        },
      ]
    : [{ role: "delete" }, { type: "separator" }, { role: "selectAll" }]
  return {
    label: t("edit"),
    submenu: [
      historyItem(bus, "edit.undo", {
        label: t("undo"),
        accelerator: "CmdOrCtrl+Z",
      }),
      historyItem(bus, "edit.redo", {
        label: t("redo"),
        accelerator: "Shift+CmdOrCtrl+Z",
      }),
      { type: "separator" },
      { role: "cut" },
      { role: "copy" },
      { role: "paste" },
      ...extras,
    ],
  }
}

/**
 * Native menus raise typed commands; the renderer decides what each one does.
 * Machine › Stop and Help › Export Protocol Trace are the exceptions: they go straight to
 * the machine in main, so they work even when the renderer is unresponsive, as does Help ›
 * Export Log. The update items (electron/main/updates.ts) are main's too; in builds that
 * cannot update, Check for Updates… says so. Windows has no application menu: the About panel
 * and the open-source licenses (electron/main/about.ts) are at the end of Help there.
 */
export function buildApplicationMenu(
  bus: MenuBus,
  machine: { stop: () => void; exportTrace: () => void },
  updates: { enabled: boolean; check: () => void; install: () => void },
  diagnostics: { exportLog: () => void },
  about: { openCredits: () => void },
  t: TFunction<"menu">
): Menu {
  const isMac = process.platform === "darwin"
  const updateItems: MenuItemConstructorOptions[] = [
    {
      id: UPDATE_CHECK_ITEM,
      label: t("checkUpdates"),
      click: () => updates.check(),
    },
    ...(updates.enabled
      ? [
          {
            id: UPDATE_INSTALL_ITEM,
            label: t("installUpdate"),
            visible: false,
            click: () => updates.install(),
          },
        ]
      : []),
  ]
  const settings: MenuItemConstructorOptions = {
    label: t("settings"),
    accelerator: "CmdOrCtrl+,",
    click: () => bus.emit("settings.open"),
  }
  const models: MenuItemConstructorOptions = {
    label: t("models"),
    click: () => bus.emit("models.manage"),
  }
  const tools: MenuItemConstructorOptions = {
    label: t("toolLibrary"),
    click: () => bus.emit("tools.manage"),
  }
  const appMenu: MenuItemConstructorOptions[] = isMac
    ? [
        {
          label: app.name,
          submenu: [
            { role: "about" },
            ...updateItems,
            { type: "separator" },
            settings,
            models,
            tools,
            { type: "separator" },
            { role: "services" },
            { type: "separator" },
            { role: "hide" },
            { role: "hideOthers" },
            { role: "unhide" },
            { type: "separator" },
            { role: "quit" },
          ],
        },
      ]
    : []
  const fileExtras: MenuItemConstructorOptions[] = isMac
    ? []
    : [
        { type: "separator" },
        settings,
        models,
        tools,
        { type: "separator" },
        { role: "quit" },
      ]
  return Menu.buildFromTemplate([
    ...appMenu,
    {
      label: t("file"),
      submenu: [
        {
          label: t("newProject"),
          accelerator: "CmdOrCtrl+N",
          click: () => bus.emit("project.new"),
        },
        {
          label: t("openProject"),
          accelerator: "CmdOrCtrl+O",
          click: () => bus.emit("project.open"),
        },
        {
          label: t("importProgram"),
          accelerator: "Shift+CmdOrCtrl+O",
          click: () => bus.emit("program.import"),
        },
        {
          label: t("importFromFusion"),
          click: () => bus.emit("fusion.import"),
        },
        { type: "separator" },
        {
          label: t("saveProject"),
          accelerator: "CmdOrCtrl+S",
          click: () => bus.emit("project.save"),
        },
        ...fileExtras,
      ],
    },
    editMenu(bus, isMac, t),
    {
      label: t("machine"),
      submenu: [
        {
          id: MACHINE_STOP_ITEM,
          label: t("stop"),
          accelerator: "CmdOrCtrl+.",
          enabled: false,
          click: () => machine.stop(),
        },
      ],
    },
    { role: "viewMenu" },
    { role: "windowMenu" },
    {
      role: "help",
      submenu: [
        {
          label: t("glossary"),
          click: () => bus.emit("glossary.open"),
        },
        { type: "separator" },
        {
          label: t("exportTrace"),
          click: () => machine.exportTrace(),
        },
        {
          label: t("exportLog"),
          click: () => diagnostics.exportLog(),
        },
        ...(isMac
          ? []
          : [
              { type: "separator" } as const,
              ...updateItems,
              { type: "separator" } as const,
              {
                label: t("licenses"),
                click: () => about.openCredits(),
              },
              { role: "about" } as const,
            ]),
      ],
    },
  ])
}
