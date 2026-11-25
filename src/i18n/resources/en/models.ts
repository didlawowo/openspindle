/** Strings of the Models library: its dialog, import and usage lines. */
export const enModels = {
  dialog: {
    title: "Models",
    count_one: "{{count}} model",
    count_other: "{{count}} models",
    region: "Models",
    emptyTitle: "No models yet",
    emptyDescription:
      "Add STEP or GLB files of your fixtures, such as vises and clamps, to place them on the bed.",
  },
  add: {
    filesAria: "Model files",
    button: "Add models…",
    cancel: "Cancel",
    note: "STEP files are tessellated on this computer and kept with their mesh. Fixtures place models on the bed.",
    failed_one: "{{count}} file could not be added",
    failed_other: "{{count}} files could not be added",
    couldNotRead: "it could not be read.",
    steps: {
      reading: "Reading",
      tessellating: "Tessellating",
      saving: "Saving",
    },
  },
  row: {
    nameAria: "Name of {{name}}",
    renameAria: "Rename {{name}}",
    deleteAria: "Delete {{name}}",
  },
  delete: {
    title: "Delete {{name}}?",
    used: "{{usage}}. Their fixtures will show a box of its size until they get another model.",
    unused: "It is not used by any fixture.",
    cancel: "Cancel",
    confirm: "Delete",
  },
  details: {
    fromProject: "From a project",
    triangles_one: "{{count}} triangle",
    triangles_other: "{{count}} triangles",
  },
  usage: {
    none: "Not used",
    usedBy: "Used by {{parts}}",
    definitions_one: "{{count}} fixture definition",
    definitions_other: "{{count}} fixture definitions",
    plates_one: "{{count}} plate",
    plates_other: "{{count}} plates",
    and: " and ",
  },
}
