/** Strings of the design rules: their results card, settings page and summary. */
export const enDesignRules = {
  title: "Design rules",
  cardAria: "Design rules",
  outOfDate: "Out of date",
  summary: {
    noProblems: "No problems",
    error_one: "error",
    error_other: "errors",
    warning_one: "warning",
    warning_other: "warnings",
  },
  empty: "Nothing on this plate breaks a design rule.",
  checkAgain: "Check again",
  close: "Close",
  closeAria: "Close design rules",
  show: "Show",
  showAria: "Show {{label}} in the 3D view",
  applyAria: "Apply: {{suggestion}}",
  settings: {
    title: "Workspace settings",
    page: "Design rules",
    description:
      "What a plate’s program is checked against, in Prepare and before Run. They are saved with the project.",
    severityAria: "{{label}} severity",
    reset: "Reset to defaults",
    save: "Save",
  },
  severity: {
    error: "Error",
    warning: "Warning",
    ignore: "Ignore",
  },
  // Rule labels and descriptions come from the domain and are used in diagnostics; they stay
  // in English, so these lookups fall back to them.
  rules: {} as Record<string, { label: string; description: string }>,
}
