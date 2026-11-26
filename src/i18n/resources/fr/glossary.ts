import type { UiResources } from "../en"

/** Chaînes du glossaire G-code : dialogue, pastilles et groupes. */
export const frGlossary: UiResources["glossary"] = {
  title: "Glossaire G-code",
  searchAria: "Rechercher les codes",
  searchPlaceholder: "Rechercher un code, un nom ou une description",
  emptyTitle: "Aucun code ne correspond",
  emptyDescription: "Rechercher un code, comme G18, ou ce qu’il fait.",
  words: "Mots",
  example: "Exemple",
  badge: {
    ignored: "Ignoré",
    unsupported: "Non pris en charge",
    combines: "Combinable",
    notCombined: "Non combinable",
  },
  reason: {
    ignored: "La {{machine}} l’accepte sans effet.",
    unsupported: "La {{machine}} ne l’exécute pas.",
    combines:
      "Les opérations qui l’utilisent se combinent en un seul programme.",
  },
  groups: {
    motion: "Mouvement",
    "plane-units": "Plans, unités et modes",
    coordinates: "Coordonnées et décalages",
    "spindle-tool": "Broche et outils",
    probing: "Palpage",
    accessories: "Accessoires",
    program: "Déroulement du programme",
    settings: "Réglages de la machine",
    words: "Mots",
  },
}
