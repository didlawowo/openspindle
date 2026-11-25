/**
 * The probing forms and the probing picker. Strategy, parameter, corner, axes and routine
 * labels live in the pure domain in English; these keys show them in the interface's
 * language, with the domain's English as `defaultValue` where a key is missing.
 */
export const enProbing = {
  fields: {
    workArea: "Work area",
    picking: "Picking in the 3D view…",
    probePosition: "Probe position",
    unavailableAnchor: "Unavailable anchor",
    placement: "Placement",
    pickIn3d: "Pick in the 3D view",
  },
  strategies: {
    "outside-corner": {
      label: "Outside corner",
      description:
        "Find an outside corner of the stock and set the work origin there.",
    },
    "inside-corner": {
      label: "Inside corner",
      description: "Find an inside corner and set the work origin there.",
    },
    "pocket-center": {
      label: "Pocket center",
      description:
        "Find the center of a pocket or bore and set work X and Y there.",
    },
    "boss-center": {
      label: "Boss center",
      description:
        "Find the center of a boss, such as the stock itself, and set the work origin there.",
    },
    "touch-off": {
      label: "Z surface",
      description: "Probe the stock's top surface and set work Z there.",
    },
    "height-map": {
      label: "Height map",
      description:
        "Probe a height grid on the stock surface; the machine compensates later cuts for it.",
    },
    "outline-trace": {
      label: "Outline trace",
      description: "Trace the edges of the plate's work area before cutting.",
    },
  },
  params: {
    width: { label: "Width" },
    depth: { label: "Depth" },
    xPoints: { label: "X probe points" },
    yPoints: { label: "Y probe points" },
    gridClearance: {
      label: "Clearance height",
      description:
        "Firmware H value after the first surface contact; not an absolute initial Z position.",
    },
    distanceX: {
      label: "Distance X",
      description:
        "How far in X the probe moves out from where it starts, then comes down and touches back: past a corner's side, or a boss's, which takes more than half the boss plus the ball's radius. A pocket's centring searches this far each way.",
    },
    distanceY: {
      label: "Distance Y",
      description:
        "How far in Y the probe moves out from where it starts, then comes down and touches back: past a corner's side, or a boss's, which takes more than half the boss plus the ball's radius. A pocket's centring searches this far each way.",
    },
    probeDepth: {
      label: "Probe depth",
      description:
        "How far below the top, which the probe touches first, it touches the sides.",
    },
    probeTravel: {
      label: "Probe travel",
      description:
        "How far the probe searches down before the machine alarms. After a probe change, or the travel to an anchor, it starts near the top of Z travel.",
    },
    touchClearance: {
      label: "Clearance height",
      description: "Lift above the probed surface once work Z is set.",
    },
    machineZ: {
      label: "Machine Z",
      description:
        "Absolute machine Z the probe traces at, clear of the stock and fixtures. Makera configures the Z1's clearance at -3.",
    },
    traceFeed: {
      label: "Trace feed",
      description: "How fast the probe's laser follows the outline.",
    },
  },
  corners: {
    "front-left": "Front-left",
    "front-right": "Front-right",
    "back-left": "Back-left",
    "back-right": "Back-right",
  },
  axes: {
    xy: "X and Y",
    x: "X only",
    y: "Y only",
  },
  routines: {
    "outside-corner": "Outside corner",
    "inside-corner": "Inside corner",
    "pocket-center": "Pocket center",
    "boss-center": "Boss center",
  },
  grid: {
    legend: "Probe grid",
    fit: "Fit grid",
    span: "X {{minX}} to {{maxX}} and Y {{minY}} to {{maxY}} mm from the work origin.",
    cutsCover: "The cuts cover {{span}}",
    stockCovers:
      "The plate has no machining operations; its stock covers {{span}}",
    fitCutsAnchors:
      "{{extent}} {{action}} sizes the grid to them and anchors its start at their lower-left corner.",
    fitStockAnchors:
      "{{extent}} {{action}} sizes the grid to the stock and anchors its start at the stock's lower-left corner.",
    fitNoAnchors:
      "{{extent}} Without stored anchors {{action}} only sizes the grid: position the probe above X {{minX}} Y {{minY}}.",
    review: "Review after probing",
    reviewHint:
      "Pause after probing to check the measured height map, then Resume or Stop.",
  },
  origin: {
    corner: "Corner",
    axes: "Axes",
  },
  touch: {
    legend: "Touch-off",
    hint: "The probed surface becomes work Z0, and the plate's work origin stays on the stock top.",
    center: "Center",
    middleCuts:
      "The middle of the cuts is X {{x}} Y {{y}} from the work origin.",
    middleStock:
      "The plate has no machining operations; the middle of its stock is X {{x}} Y {{y}} from the work origin.",
    centerAnchors:
      "{{middle}} {{action}} touches there, relative to a stored anchor.",
    centerNoAnchors:
      "{{middle}} Without stored anchors, position the probe there before Run.",
    centerNeedsAnchors:
      "Centering needs the stored anchors of the plate's device.",
  },
  outline: {
    legend: "Outline",
    trace: "Trace",
    traceHint:
      "Toolpath bounds: the rectangle the plate's machining cuts, from the work origin. Edges: chosen edges of the stock and fixtures, where the plate's setup puts them, from the device's first anchor, with or without machining.",
    edgesDescription:
      "Traces the chosen edges where the plate's setup puts them, in machine coordinates from the device's first anchor, whatever work X and Y are.",
    targetToolpath: "Toolpath bounds",
    targetEdges: "Edges",
    nothingToTrace: "Nothing to trace: {{reason}}",
    tracesSpan:
      "Traces X {{x0}} to {{x1}} and Y {{y0}} to {{y1}} mm from the work origin: where the plate's machining cuts, outlined in the 3D view.",
    tracedEdges: "Traced edges",
    missingEdge: "Missing edge · {{side}}",
    remove: "Remove {{label}}",
    pickEdges: "Pick edges",
    stockOutline: "Stock outline",
    noStock: "The plate has no stock.",
    pause: "Pause after tracing",
    pauseHint:
      "Pause after the trace to check the outline against the stock and fixtures, then Resume or Stop.",
  },
  review: {
    flat: "The surface is flat",
    uneven: "The surface is uneven",
    unreliable: "Check the probing before resuming",
    grid: "Grid",
    measured: "Measured",
    outliers: "Outliers",
    minimum: "Minimum",
    maximum: "Maximum",
    mean: "Mean",
    range: "Range",
    tilt: "Tilt",
    flatness: "Flatness",
    probedExpected: " · probed {{columns}} × {{rows}}",
    reading: "Reading the height map…",
    readingHint: "M375.1 reports the heights the firmware measured.",
    readFailed: "The height map could not be read",
    none: "No height map yet",
    noneHint: "Read the height map to review the probing.",
    aria: "Height map review",
    title: "Review height map",
    description:
      "The job is paused after probing. Check the measured heights, then Resume to continue or Stop.",
    readAt: "Read at",
    retryAria: "Retry height map read",
    retrying: "Reading…",
    retry: "Retry read",
  },
  tools: {
    touchesZ: "Touches Z",
    touchesXYZ: "Touches X Y Z",
    touchesWithPointer: "{{touches}} · laser pointer",
    inNumber: "{{name}} in T{{number}}",
    missingTool: "a tool missing from the library",
    stranded_one: "{{names}} cannot use it",
    stranded_other: "{{names}} cannot use it",
    replacesShared_one:
      "Replaces {{entry}}, which {{count}} other operation uses.",
    replacesShared_other:
      "Replaces {{entry}}, which {{count}} other operations use.",
  },
}
