import { describe, expect, test } from "vitest"
import { RUN_LIMITS } from "../../contract/index.ts"
import { ProgramError } from "../adapter.ts"
import { prepareMakeraProgram } from "./dialect.ts"

const prepare = (...lines: string[]) =>
  prepareMakeraProgram(`${lines.join("\n")}\n`)

/** The lines the machine receives. */
const sent = (...lines: string[]) =>
  prepare(...lines)
    .text.split("\n")
    .slice(0, -1)

const speedChanges = (...lines: string[]) =>
  prepare(...lines).changes.filter(
    (change) => change.reason === "spindle-speed"
  )

describe("spindle speed", () => {
  test("pcb2gcode's speed on a line of its own reaches its bare M3", () => {
    const program = prepare(
      "G21",
      "S12000    (RPM spindle speed.)",
      "T1",
      "M5      (Spindle stop.)",
      "M6      (Tool change.)",
      "M0      (Temporary machine stop.)",
      "M3        (Spindle on clockwise.)"
    )
    expect(program.text.split("\n").slice(0, -1)).toEqual([
      "G21",
      "S12000",
      "T1",
      "M5",
      "M6 T1",
      "",
      "M3 S12000",
    ])
    expect(
      program.changes.filter((change) => change.reason === "spindle-speed")
    ).toEqual([
      { line: 7, before: "M3", after: "M3 S12000", reason: "spindle-speed" },
    ])
  })

  test("pcb2gcode's speed on a G0 reaches its bare M3", () => {
    expect(
      sent("G00 S12000     (RPM spindle speed.)", "T1", "M6", "M3").at(-1)
    ).toBe("M3 S12000")
  })

  test("an M3 whose command has an S is sent as written", () => {
    expect(
      speedChanges("S9000", "M3 S10000", "S10000 M3", "G0 S10000 M3")
    ).toEqual([])
  })

  test("the S the program set last counts, an M3's own too", () => {
    expect(sent("S10000", "S12000", "M3").at(-1)).toBe("M3 S12000")
    expect(sent("M3 S9000", "M5", "M3").at(-1)).toBe("M3 S9000")
    expect(sent("S012000.50", "M3").at(-1)).toBe("M3 S012000.50")
  })

  test("an S another code takes is no speed", () => {
    // M223 S is the rpm override in percent, G4 S the Z1's dwell in seconds.
    expect(sent("S12000", "M223 S80", "G4 S2", "M3").at(-1)).toBe("M3 S12000")
  })

  test("an M3 before any S is sent bare", () => {
    expect(sent("M3", "G1 X1 F100")).toEqual(["M3", "G1 X1 F100"])
    expect(speedChanges("M3")).toEqual([])
  })

  test("an M4 gets the speed too", () => {
    expect(sent("S12000", "M4").at(-1)).toBe("M4 S12000")
  })

  test("the speed goes where the firmware reads it with the M3", () => {
    // GcodeDispatch.cpp splits a line into commands: one starting with M ends at the next G
    // or M, one starting with T at the first S after its M code, and a G line has its G90
    // moved to the front first, which here joins M5 and T1 into one command.
    const cases = {
      "M3 G0 X1": "M3 S12000 G0 X1",
      "M3 M8": "M3 S12000 M8",
      "G0 X1 M3": "G0 X1 M3 S12000",
      "T1 M3": "T1 S12000 M3",
      "Z-1 M5 G90 T1 M3": "Z-1 M5 G90 T1 M3 S12000",
      "M3 G0 S15000": "M3 S15000 G0 S15000",
      "n10 m3": "M3 S12000",
    }
    for (const [line, expected] of Object.entries(cases))
      expect(sent("S12000", line).at(-1), line).toBe(expected)
  })

  test("a line the speed takes past 63 bytes is refused", () => {
    const line = (length: number) => `G1 X${"1".repeat(length - 7)} M3`
    expect(sent("S12000", line(56)).at(-1)?.length).toBe(63)
    try {
      prepare("S12000", line(57))
      expect.unreachable("the over-long line was accepted")
    } catch (error) {
      expect(error).toBeInstanceOf(ProgramError)
      expect((error as ProgramError).line).toBe(2)
      expect((error as ProgramError).message).toMatch(/63-byte line limit/)
    }
  })

  test("a part after the first gets the speed an earlier part set", () => {
    const moves = Array.from(
      { length: RUN_LIMITS.fileLines * 0.6 },
      (_, index) => `G1 X${index % 10}`
    )
    const source = [
      ["G21", "G90", "S12000", "T1", "M6", "M3", "G1 X0 F100"],
      moves,
      ["M5", "T2", "M6", "M3"],
      moves,
      ["M5", "M2"],
    ].flat()
    const program = prepareMakeraProgram(`${source.join("\n")}\n`)
    const lines = program.text.split("\n")
    expect(program.parts.length).toBe(2)
    const [, second] = program.parts
    expect(lines[second.startLine - 1]).toBe("M6 T2")
    expect(lines[second.startLine]).toBe("M3 S12000")
    expect(second.before).toEqual(["G21 G90", "F100"])
  })
})
