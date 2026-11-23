export const enSettings = {
  title: "Settings",
  sections: {
    general: "General",
    pcb: "PCB",
    privacy: "Privacy",
  },
  couldNotSave: "This setting could not be saved: {{message}}",
  language: {
    label: "Language",
    hint: "The language of the app's interface. System follows your computer's language. Menus macOS draws itself, like Edit's Cut and Copy, follow your computer's language.",
    optionSystem: "System",
    optionEnglish: "English",
    optionFrench: "Français",
  },
  appearance: {
    label: "Color mode",
    hint: "System follows your Mac’s light or dark appearance.",
    optionSystem: "System",
    optionLight: "Light",
    optionDark: "Dark",
  },
  displayFont: { label: "Display font", hint: "The font for text." },
  monoFont: {
    label: "Mono font",
    hint: "The font for G-code, and for the digits of numbers shown as values.",
  },
  simulator: {
    label: "Z1 Simulator device",
    hint: "A simulated Makera Z1 that OpenSpindle runs at {{host}}:{{port}}, to try jobs without a machine. Connect to it as to a machine.",
    notRunning: "The simulator is not running. {{error}}",
  },
  privacy: {
    debugLevel: "Debug level",
    debugLevelHint:
      "How much the log records (Help › Export Log). Debug records the most, to track down a problem.",
    levelError: "Error",
    levelWarning: "Warning",
    levelInfo: "Info",
    levelDebug: "Debug",
    autoReports: "Send error reports automatically",
    autoReportsHint:
      "Errors go to the OpenSpindle developers as they happen, with the app version, your system and what led up to them, never your projects. Otherwise you choose in the error dialog.",
  },
  pcb: {
    executable: "pcb2gcode executable",
    automaticDetection: "Automatic detection",
    checking: "Checking pcb2gcode…",
    choose: "Choose executable",
    checkingShort: "Checking…",
    checkAgain: "Check again",
    useAutomatic: "Use automatic detection",
  },
}
