import type { FormEvent } from "react"
import { useTranslation } from "react-i18next"
import type { TFunction } from "i18next"
import {
  Questionnaire,
  QuestionnaireActions,
  QuestionnaireChoice,
  QuestionnaireChoiceDescription,
  QuestionnaireChoices,
  QuestionnaireDescription,
  QuestionnaireError,
  QuestionnaireItem,
  QuestionnaireNext,
  QuestionnairePrevious,
  QuestionnaireProgress,
  QuestionnaireSubmit,
  QuestionnaireTitle,
} from "@/components/ui/questionnaire"
import { ProblemText } from "@/components/workspace/problem-text"
import { AS_IS } from "@/app/workspace/import-plan"
import type {
  ImportPlan,
  PlannedIssue,
  PlannedProgram,
  ProgramAnswer,
} from "@/app/workspace/import-plan"
import { useWorkspace } from "@/app/workspace/workspace-context"
import {
  suggestedChoice,
  suggestionOf,
} from "@/domain/design-rules/program-rules"
import type { Resolution } from "@/domain/design-rules/program-rules"
import { linesText } from "@/domain/nc/program-lines"
import { plateLabel } from "@/domain/plate/plate"
import type { Plate } from "@/domain/plate/plate"
import { capitalize } from "@/domain/primitives"
import type { SplitMode, SplitPart } from "@/domain/post-processing/split"
import { AppDialog } from "./app-dialog"
import { closeDialog } from "./dialogs"
import { useApplyImport } from "./use-import"

/** One question of the questionnaire, and the answer it starts with. */
type Question = {
  readonly name: string
  readonly title: string
  /** What an issue's question is about, and what resolves it. */
  readonly problem?: { readonly text: string; readonly suggestion: string }
  readonly choices: ReadonlyArray<{
    readonly value: string
    readonly label: string
    readonly description?: string
  }>
  readonly initial: string
}

/** The plate answer for a new plate; no plate has an empty id. */
const NEW_PLATE = ""
const WHOLE = "whole"

const splitName = (index: number) => `split-${index}`

/** The shell's translations, passed to the question builders. */
type ShellT = TFunction<"shell">

/**
 * An issue alike in one program or several, asked about once: the same rule, problem and
 * choices. `programs` holds the indexes of the plan's programs it is in, and where it is there.
 */
type IssueGroup = {
  readonly name: string
  readonly issue: PlannedIssue
  readonly programs: ReadonlyArray<{
    readonly index: number
    readonly lines: readonly number[]
  }>
}

const issueKey = (issue: PlannedIssue) =>
  [
    issue.rule,
    issue.problem,
    ...issue.choices.map((choice) => `${choice.resolution} ${choice.label}`),
  ].join("\n")

/** The plan's issues, alike ones together, in the order the programs first have them. */
function issueGroups(plan: ImportPlan): IssueGroup[] {
  const groups = new Map<
    string,
    {
      issue: PlannedIssue
      programs: { index: number; lines: readonly number[] }[]
    }
  >()
  plan.programs.forEach((program, index) => {
    for (const issue of program.issues) {
      const key = issueKey(issue)
      const group = groups.get(key)
      if (group) group.programs.push({ index, lines: issue.lines })
      else groups.set(key, { issue, programs: [{ index, lines: issue.lines }] })
    }
  })
  return [...groups.values()].map((group, number) => ({
    name: `issue-${number}`,
    ...group,
  }))
}

function plateQuestion(
  plan: ImportPlan,
  plates: readonly Plate[],
  selectedPlateId: string | null,
  t: ShellT
): Question {
  const [only] = plan.programs
  return {
    name: "plate",
    title:
      plan.programs.length === 1
        ? t("import.plateOne", { file: only.fileName })
        : t("import.plateMany"),
    choices: [
      ...plates.map((plate, index) => ({
        value: plate.id,
        label: plateLabel(plate, index),
      })),
      { value: NEW_PLATE, label: t("import.newPlate") },
    ],
    initial: selectedPlateId ?? NEW_PLATE,
  }
}

const partNames = (parts: readonly SplitPart[], t: ShellT) =>
  t("import.parts", {
    count: parts.length,
    names: parts.map((part) => part.name).join(", "),
  })

function splitQuestion(
  program: PlannedProgram,
  index: number,
  t: ShellT
): Question | null {
  const { tool, toolpath } = program.split
  if (!tool.length && !toolpath.length) return null
  const modes: Array<{ mode: SplitMode; label: string }> = [
    { mode: "tool", label: t("import.byTool") },
    { mode: "toolpath", label: t("import.byToolpath") },
  ]
  return {
    name: splitName(index),
    title: t("import.splitTitle", { file: program.fileName }),
    choices: [
      {
        value: WHOLE,
        label: t("import.noSplitting"),
        description: t("import.oneOperation"),
      },
      ...modes.flatMap(({ mode, label }) =>
        program.split[mode].length
          ? [
              {
                value: mode,
                label,
                description: partNames(program.split[mode], t),
              },
            ]
          : []
      ),
    ],
    initial: WHOLE,
  }
}

/** Where an issue is: its lines in one program, or the programs it is in. */
function issuePlace(plan: ImportPlan, group: IssueGroup, t: ShellT): string {
  const [first, ...others] = group.programs
  const { fileName } = plan.programs[first.index]
  if (!others.length)
    return t("import.issueInFile", {
      lines: capitalize(linesText(first.lines)),
      file: fileName,
    })
  return t("import.issueInMany", { count: others.length, file: fileName })
}

function issueQuestion(
  plan: ImportPlan,
  group: IssueGroup,
  t: ShellT
): Question {
  const { issue } = group
  return {
    name: group.name,
    title: issue.label,
    problem: {
      text: `${issue.problem} ${issuePlace(plan, group, t)}`,
      suggestion: suggestionOf(issue),
    },
    choices: issue.choices.map((choice) => ({
      value: choice.resolution,
      label: choice.label,
      description: choice.description,
    })),
    initial: (suggestedChoice(issue) ?? issue.choices[0]).resolution,
  }
}

/**
 * What to ask, in order: the plate, then per program how to split it and the issues it is the
 * first to have, each asked once for every program that has it.
 */
function questionsOf(
  plan: ImportPlan,
  groups: readonly IssueGroup[],
  plates: readonly Plate[],
  selectedPlateId: string | null,
  t: ShellT
): Question[] {
  const programs = plan.programs.flatMap((program, index) => {
    // An update keeps the operation the part of the program it was.
    const split =
      plan.target.kind === "operation" ? null : splitQuestion(program, index, t)
    return [
      ...(split ? [split] : []),
      ...groups
        .filter((group) => group.programs[0].index === index)
        .map((group) => issueQuestion(plan, group, t)),
    ]
  })
  // An update's programs replace an operation's NC: they go to no plate of the user's choosing.
  return plates.length && plan.programs.length && plan.target.kind === "plate"
    ? [plateQuestion(plan, plates, selectedPlateId, t), ...programs]
    : programs
}

/** The answers, from the questionnaire's form: what was not asked goes as it is. */
function answersOf(
  plan: ImportPlan,
  groups: readonly IssueGroup[],
  data: FormData,
  selectedPlateId: string | null
) {
  const text = (name: string) => {
    const value = data.get(name)
    return typeof value === "string" ? value : null
  }
  const plate = text("plate")
  return {
    plateId: plate === null ? selectedPlateId : plate || null,
    programs: plan.programs.map((program, index): ProgramAnswer => {
      const split = text(splitName(index))
      return {
        split: split === "tool" || split === "toolpath" ? split : AS_IS.split,
        resolutions: Object.fromEntries(
          program.issues.map((issue) => {
            const group = groups.find(
              (item) => issueKey(item.issue) === issueKey(issue)
            )
            const answer = group ? text(group.name) : null
            return [issue.rule, (answer ?? "ignore") as Resolution]
          })
        ),
      }
    }),
  }
}

/**
 * Asks what importing needs to know, one question at a time: the plate the programs go to, how
 * to split each program that can be, and what to do about each thing the machine would not
 * run as written, once for all programs alike. Nothing changes until the last answer imports
 * them.
 */
export function ImportDialog({ plan }: { plan: ImportPlan }) {
  const { t } = useTranslation("shell")
  const plates = useWorkspace((state) => state.plates)
  const selectedPlateId = useWorkspace((state) => state.selectedPlateId)
  const applyImport = useApplyImport()
  const groups = issueGroups(plan)
  const questions = questionsOf(plan, groups, plates, selectedPlateId, t)
  const items = questions.map((question) => ({
    name: question.name,
    required: true,
    choices: question.choices.map(({ value }) => ({ value })),
  }))
  // An update asks only about issues its program has that the operation's import did not.
  const verb =
    plan.target.kind === "operation"
      ? t("import.verbUpdate")
      : t("import.verbImport")
  const title =
    plan.programs.length === 1
      ? t("import.titleFile", { verb, file: plan.programs[0].fileName })
      : t("import.titlePrograms", { verb, count: plan.programs.length })
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const answers = answersOf(
      plan,
      groups,
      new FormData(event.currentTarget),
      selectedPlateId
    )
    closeDialog()
    applyImport(plan, answers)
  }
  return (
    <AppDialog title={title} width="wide" onClose={closeDialog}>
      <Questionnaire items={items} onSubmit={submit}>
        <QuestionnaireProgress />
        {questions.map((question) => (
          <QuestionnaireItem key={question.name} name={question.name} required>
            <QuestionnaireTitle>{question.title}</QuestionnaireTitle>
            {question.problem && (
              <QuestionnaireDescription render={<div />}>
                <ProblemText
                  problem={question.problem.text}
                  suggestion={question.problem.suggestion}
                />
              </QuestionnaireDescription>
            )}
            <QuestionnaireChoices>
              {question.choices.map((choice) => (
                <QuestionnaireChoice
                  key={choice.value}
                  value={choice.value}
                  defaultChecked={choice.value === question.initial}
                >
                  <span className="font-medium">{choice.label}</span>
                  {choice.description && (
                    <QuestionnaireChoiceDescription>
                      {choice.description}
                    </QuestionnaireChoiceDescription>
                  )}
                </QuestionnaireChoice>
              ))}
            </QuestionnaireChoices>
            <QuestionnaireError />
          </QuestionnaireItem>
        ))}
        <QuestionnaireActions>
          <QuestionnairePrevious>
            {t("questionnaire.previous")}
          </QuestionnairePrevious>
          <QuestionnaireNext>{t("questionnaire.next")}</QuestionnaireNext>
          <QuestionnaireSubmit>{verb}</QuestionnaireSubmit>
        </QuestionnaireActions>
      </Questionnaire>
    </AppDialog>
  )
}
