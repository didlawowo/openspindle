import type { UiResources } from "../en"

/** Chaînes de la connexion Fusion 360 : panneau source, appairage et mises à jour. */
export const frFusion360: UiResources["fusion360"] = {
  source: {
    setupTitle: "Configurer la connexion avec Fusion 360",
    setupDescription:
      "Dans Autodesk Fusion, cliquez sur OpenSpindle › Connect to OpenSpindle. Une boîte de dialogue s’affichera ici pour saisir le code à six chiffres.",
    learnMore: "En savoir plus",
    refreshing: "Actualisation…",
    refresh: "Actualiser",
    disconnect: "Déconnecter",
    programLabel: "Programme CN",
    chooseProgram: "Choisissez un programme",
    importNote: "L’import publie le programme avec son post-processeur Fusion.",
    readingPrograms: "Lecture des programmes CN…",
    noPrograms: "Aucun programme CN",
    noProgramsDescription:
      "Ouvrez un document Fusion et configurez un programme CN dans l’atelier Manufacture, puis actualisez.",
    posting: "Publication…",
    import: "Importer",
  },
  pairing: {
    title: "Fusion 360 souhaite se connecter",
    description: "Saisissez le code à six chiffres affiché dans Fusion 360.",
    codeLabel: "Code de connexion",
    expired:
      "Cette demande a expiré ou pris fin. Cliquez sur Connect to OpenSpindle dans Fusion pour obtenir un nouveau code.",
    cancel: "Annuler",
    connecting: "Connexion…",
    connect: "Connecter",
  },
  update: {
    notFromFusion: "Cette opération ne vient pas de Fusion 360.",
    connectFirst:
      "Connectez d’abord Fusion 360 : dans Fusion, cliquez sur OpenSpindle › Connect to OpenSpindle.",
  },
}
