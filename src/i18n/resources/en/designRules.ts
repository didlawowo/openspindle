import { RULES } from "@/domain/rules/rules"

/**
 * A configurable rule's label and description, as the domain words them: the settings page's
 * rows. Derived, so a rule's wording changes here with the rule itself.
 */
const rules = Object.fromEntries(
  RULES.filter((rule) => rule.configurable).map((rule) => [
    rule.id,
    { label: rule.label, description: rule.description },
  ])
)

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
  // Rule labels and descriptions are the domain's (`RULES`), keyed here for the settings page.
  rules,
}
