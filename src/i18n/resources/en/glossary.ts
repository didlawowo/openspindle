/** Strings of the G-code glossary: its dialog, its badges and its groups. */
export const enGlossary = {
  title: "G-code glossary",
  searchAria: "Search codes",
  searchPlaceholder: "Search codes, names and descriptions",
  emptyTitle: "No codes match",
  emptyDescription: "Search by a code, such as G18, or by what it does.",
  words: "Words",
  example: "Example",
  badge: {
    ignored: "Ignored",
    unsupported: "Unsupported",
    combines: "Combines",
    notCombined: "Not combined",
  },
  reason: {
    ignored: "The {{machine}} accepts it and does nothing with it.",
    unsupported: "The {{machine}} does not run it.",
    combines: "Operations that use it combine into one program.",
  },
  // The groups of src/domain/nc/glossary.ts's NC_GLOSSARY_GROUPS, by its keys.
  groups: {
    motion: "Motion",
    "plane-units": "Planes, units and modes",
    coordinates: "Coordinates and offsets",
    "spindle-tool": "Spindle and tools",
    probing: "Probing",
    accessories: "Accessories",
    program: "Program flow",
    settings: "Machine settings",
    words: "Words",
  } as Record<string, string>,
}
