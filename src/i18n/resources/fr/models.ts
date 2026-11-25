import type { UiResources } from "../en"

/** Chaînes de la bibliothèque de modèles : dialogue, import et lignes d’usage. */
export const frModels: UiResources["models"] = {
  dialog: {
    title: "Modèles",
    count_one: "{{count}} modèle",
    count_other: "{{count}} modèles",
    region: "Modèles",
    emptyTitle: "Aucun modèle pour l’instant",
    emptyDescription:
      "Ajoutez les fichiers STEP ou GLB de vos montages, par exemple étaus et brides, pour les placer sur le plateau.",
  },
  add: {
    filesAria: "Fichiers de modèles",
    button: "Ajouter des modèles…",
    cancel: "Annuler",
    note: "Les fichiers STEP sont maillés sur cet ordinateur et conservés avec leur maillage. Les montages placent les modèles sur le plateau.",
    failed_one: "{{count}} fichier n’a pas pu être ajouté",
    failed_other: "{{count}} fichiers n’ont pas pu être ajoutés",
    couldNotRead: "n’a pas pu être lu.",
    steps: {
      reading: "Lecture",
      tessellating: "Maillage",
      saving: "Enregistrement",
    },
  },
  row: {
    nameAria: "Nom de {{name}}",
    renameAria: "Renommer {{name}}",
    deleteAria: "Supprimer {{name}}",
  },
  delete: {
    title: "Supprimer {{name}} ?",
    used: "{{usage}}. Leurs montages afficheront un parallélépipède de sa taille jusqu’à ce qu’ils reçoivent un autre modèle.",
    unused: "Aucun montage ne l’utilise.",
    cancel: "Annuler",
    confirm: "Supprimer",
  },
  details: {
    fromProject: "Depuis un projet",
    triangles_one: "{{count}} triangle",
    triangles_other: "{{count}} triangles",
  },
  usage: {
    none: "Non utilisé",
    usedBy: "Utilisé par {{parts}}",
    definitions_one: "{{count}} définition de montage",
    definitions_other: "{{count}} définitions de montage",
    plates_one: "{{count}} plaque",
    plates_other: "{{count}} plaques",
    and: " et ",
  },
}
