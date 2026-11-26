import type { UiResources } from "../en"

/** Chaînes des règles de conception : carte de résultats, page de réglages et résumé. */
export const frDesignRules: UiResources["designRules"] = {
  title: "Règles de conception",
  cardAria: "Règles de conception",
  outOfDate: "Obsolète",
  summary: {
    noProblems: "Aucun problème",
    error_one: "erreur",
    error_other: "erreurs",
    warning_one: "avertissement",
    warning_other: "avertissements",
  },
  empty: "Rien sur cette plaque ne viole une règle de conception.",
  checkAgain: "Vérifier à nouveau",
  close: "Fermer",
  closeAria: "Fermer les règles de conception",
  show: "Afficher",
  showAria: "Afficher {{label}} dans la vue 3D",
  applyAria: "Appliquer : {{suggestion}}",
  settings: {
    title: "Réglages de l’espace de travail",
    page: "Règles de conception",
    description:
      "Ce à quoi le programme d’une plaque est comparé, dans Préparer et avant Exécuter. Ces règles sont enregistrées avec le projet.",
    severityAria: "Sévérité : {{label}}",
    reset: "Réinitialiser aux valeurs par défaut",
    save: "Enregistrer",
  },
  severity: {
    error: "Erreur",
    warning: "Avertissement",
    ignore: "Ignorer",
  },
  rules: {
    "spindle-speed": {
      label: "Vitesse de broche non définie",
      description:
        "Un programme qui démarre la broche (M3) avant d’avoir réglé une vitesse avec S tourne à la vitesse réglée avant lui, et ne se combine pas avec les autres opérations.",
    },
    "max-cutting-feed": {
      label: "Avance de coupe maximale",
      description:
        "L’avance la plus rapide à laquelle un déplacement peut couper.",
    },
    "max-plunge-rate": {
      label: "Vitesse de plongée maximale",
      description:
        "La descente la plus rapide d’un déplacement de coupe : une plongée droite à son avance, une rampe à une partie de celle-ci.",
    },
    "max-cut-depth": {
      label: "Profondeur de coupe maximale",
      description:
        "Jusqu’où une coupe peut descendre sous le dessus de la matière, au total.",
    },
    "max-depth-under-stock": {
      label: "Profondeur maximale sous la matière",
      description:
        "Jusqu’où une coupe peut descendre sous le dessous de la matière, dans ce qui la supporte.",
    },
    "spindle-stopped-while-cutting": {
      label: "Broche arrêtée pendant la coupe",
      description:
        "Un déplacement coupe alors que la broche est arrêtée, ou tourne sans vitesse.",
    },
    "rapid-into-stock": {
      label: "Déplacement rapide dans la matière",
      description: "Un déplacement rapide (G0) entre dans la matière.",
    },
    "spindle-reverse": {
      label: "Inversion de broche (M4)",
      description:
        "La broche du Z1 ne tourne que dans le sens horaire. Il ignore M4, donc la broche reste arrêtée pendant que le programme coupe.",
    },
    "relative-arc-centres": {
      label: "Centres d’arc relatifs (G91.1)",
      description:
        "Le Z1 lit G91.1 comme G91, donc les déplacements qui suivent sont pris comme des distances. Ses centres d’arc sont toujours des décalages depuis le départ de l’arc, ce que G91.1 demande.",
    },
    "absolute-arc-centres": {
      label: "Centres d’arc absolus (G90.1)",
      description:
        "Le Z1 lit G90.1 comme G90 et prend toujours I, J et K comme des décalages depuis le départ de l’arc, donc les arcs qui suivent tournent autour du mauvais centre.",
    },
    "radius-arcs": {
      label: "Arcs donnés par un rayon (R)",
      description:
        "Le Z1 ne prend le centre d’un arc que depuis I, J et K, donc un arc donné par R n’a pas de centre.",
    },
    "mode-cancels": {
      label: "Annulations de mode (G40, G49, G80)",
      description:
        "G40, G49 et G80 annulent la compensation d’outil, les corrections de longueur d’outil et les cycles fixes. Le Z1 ne les connaît pas et ne fait rien avec ces codes, mais les opérations qui les contiennent ne se combinent pas.",
    },
    "tool-length-offsets": {
      label: "Corrections de longueur d’outil (G43)",
      description:
        "Le Z1 mesure chaque outil à son changement d’outil et applique sa longueur lui-même. Il ne connaît pas G43.",
    },
    "cutter-compensation": {
      label: "Compensation d’outil (G41, G42)",
      description:
        "Le Z1 n’a pas de compensation de rayon d’outil : il usine le tracé programmé, pas un tracé décalé du rayon de l’outil.",
    },
    "erase-stored-data": {
      label: "Effacer les outils enregistrés (M498.2)",
      description:
        "M498.2 met à zéro le numéro d’outil, les longueurs d’outil et les décalages G54 enregistrés par le Z1 : l’origine pièce et les réglages issus du palpage de référence des outils sont perdus.",
    },
    "firmware-commands": {
      label: "Commandes micrologicielles (rm, config-set, play)",
      description:
        "Les commandes propres au Z1 qui suppriment ou renomment des fichiers sur son stockage, modifient ses réglages ou ses réglages d’usine, lancent le mode de mise à jour du micrologiciel ou exécutent un fichier hors Exécuter.",
    },
    "pcb/plot-origin": {
      label: "PCB tracé depuis son coin inférieur gauche",
      description:
        "Les fichiers Gerber et de perçage tracés depuis une origine de fichier de perçage/positionnement sur le coin inférieur gauche de la carte sont usinés depuis ce coin, que l’origine pièce représente alors, comme le coin avant gauche de la matière.",
    },
  },
}
