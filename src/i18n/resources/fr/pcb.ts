import type { UiResources } from "../en"

export const frPcb: UiResources["pcb"] = {
  editor: {
    noLongerAvailable: "Cette opération PCB n’est plus disponible.",
    projectChanged:
      "Le projet a changé pendant la génération de ce parcours d’outil.",
    locked:
      "La modification PCB est indisponible pendant un import ou un travail en cours.",
    changedSinceRead: "Cette opération a changé depuis sa lecture.",
    toolGone:
      "L’outil choisi n’est plus dans la bibliothèque. Choisissez-le de nouveau.",
    replacedElsewhere:
      "Cette opération a été modifiée ailleurs ; ses réglages enregistrés ont remplacé vos modifications non enregistrées.",
    blockFailed: "Impossible de bloquer cette opération : {{detail}}",
    saveFailed: "Impossible d’enregistrer cette opération : {{detail}}",
    savingFailed: "échec de l’enregistrement.",
    needsStock:
      "Attribuez une matière à cette plaque dans l’espace de travail avant de générer cette opération.",
    parameterRequired: "{{label}} est obligatoire.",
    parameterOutOfRange: "{{label}} est hors de sa plage prise en charge.",
    chooseOperationFirst:
      "Choisissez une opération avant de générer son parcours d’outil.",
    oneOperationOnly: "Cette source doit produire exactement une opération.",
    updateFailed: "Impossible de mettre à jour ce parcours d’outil.",
    toolOrPresetChanged:
      "Cet outil ou ce préréglage a changé. Choisissez-le de nouveau dans la bibliothèque.",
    readFailed: "Impossible de lire ce fichier.",
    chooseGerberOrDrill: "Choisissez un fichier Gerber ou de percage.",
    chooseSmallerFile: "Choisissez un fichier source de moins de 8 Mio.",
    updatedToast: "{{name}} mis à jour. {{text}}",
    chooseTool: "Choisir un outil dans la bibliothèque…",
    chooseToolAria: "Choisir un outil dans la bibliothèque",
    missingCuttingValues:
      "Saisissez les valeurs de coupe manquantes : {{values}}.",
    operationField: "Opération",
    chooseOperation: "Choisir une opération…",
    toolField: "Outil",
    retry: "Réessayer",
    chooseConverter: "Choisir pcb2gcode",
    checking: "Vérification…",
    checkAgain: "Vérifier à nouveau",
    updating: "Mise à jour du parcours d’outil…",
  },
  generation: {
    multipleTools:
      "Ce fichier génère plusieurs emplacements d’outil ({{slots}}). Les opérations PCB utilisent un seul outil.",
    multipleToolsDrill:
      "Ce fichier génère plusieurs emplacements d’outil ({{slots}}). Les opérations PCB utilisent un seul outil. Choisissez Perçage à la fraise pour faire tous les trous avec une seule fraise.",
  },
  importer: {
    newPlate: "Ajoutez les opérations PCB à une nouvelle plaque.",
    existingPlate: "Ajouter des opérations à {{plate}} · {{stock}}",
    noStock: "Aucune matière attribuée",
    dropHere: "Déposez ici les fichiers Gerber et de percage",
    dropHint:
      "Chaque fichier crée sa propre opération sur cette plaque. Les types de fichiers sont détectés automatiquement ; les fichiers sans rapport sont ignorés. Sélectionnez une opération pour choisir son outil et ses réglages.",
    filesAria: "Choisir les fichiers sources PCB",
    chooseFiles: "Choisir des fichiers",
    importing: "Import des fichiers…",
    jobActive:
      "La modification PCB est indisponible pendant un travail en cours.",
    projectChangedBefore:
      "Le projet a changé avant le début de cet import. Importez de nouveau les fichiers.",
    overSourceLimit: "{{name}} dépasse la limite de 8 Mio par fichier source.",
    tooLargeForOperation:
      "{{name}} est trop volumineux pour être conservé dans une opération.",
    noSupportedFiles:
      "Aucun fichier PCB pris en charge trouvé. Choisissez des fichiers cuivre, masque de soudure, contour ou percage.",
    tooManyFiles: "Importez au plus {{max}} fichiers PCB à la fois.",
    projectChangedDuring:
      "Le projet a changé pendant la lecture de ces fichiers. Importez-les de nouveau.",
    importFailed: "L’import des fichiers choisis a échoué.",
  },
  toolChoice: {
    title: "Choisir un outil",
    presetTitle: "Appliquer un préréglage de coupe ?",
    presetDescription:
      "L’opération PCB peut prendre la vitesse de broche, les avances et les profondeurs du préréglage, ou garder les valeurs de coupe actuelles de l’opération.",
    presetLabel: "Préréglage de coupe",
    presetPlaceholder: "Choisir un préréglage…",
    keepValues: "Garder les valeurs actuelles",
    applyPreset: "Appliquer le préréglage",
  },
  operationKinds: {
    front: "Face avant",
    back: "Face arrière",
    "front-mask": "Masque face avant",
    "back-mask": "Masque face arrière",
    outline: "Contour",
    drill: "Perçage",
    "mill-drill": "Perçage à la fraise",
  },
  parameters: {
    zsafe: "Hauteur de dégagement",
    zchange: "Hauteur de changement d’outil (coordonnées de travail)",
    zwork: "Profondeur",
    millDiameter: "Diamètre effectif de l’outil",
    isolationWidth: "Espacement minimal",
    millFeed: "Avance",
    millVertfeed: "Avance de plongée",
    millSpeed: "Vitesse de broche",
    maskDepth: "Profondeur",
    maskDiameter: "Diamètre effectif de l’outil",
    maskFeed: "Avance",
    maskVertfeed: "Avance de plongée",
    maskSpeed: "Vitesse de broche",
    maskStepover: "Recouvrement",
    maskPasses: "Passes",
    maskEdgePasses: "Passes de bord",
    maskLeadRadius: "Rayon d’entrée-sortie",
    drillMethod: "Méthode",
    zdrill: "Profondeur",
    milldrillDiameter: "Diamètre de l’outil",
    milldrillInfeed: "Profondeur par passe",
    milldrillFeed: "Avance",
    drillFeed: "Avance de plongée",
    drillSpeed: "Vitesse de broche",
    drillSide: "Usiner depuis",
    zcut: "Profondeur",
    cutterDiameter: "Diamètre de l’outil",
    cutInfeed: "Profondeur par passe",
    cutFeed: "Avance",
    cutVertfeed: "Avance de plongée",
    cutSpeed: "Vitesse de broche",
    cutSide: "Usiner depuis",
    bridges: "Largeur des ponts de maintien (0 désactive)",
    bridgesnum: "Nombre de ponts de maintien",
    zbridges: "Dessus des ponts de maintien",
    mirrorAxis: "Axe X de retournement face arrière",
    zeroStart: "Décaler le projet à zéro (sinon conserver l’origine KiCad)",
  },
  parameterOptions: {
    drillSide: {
      front: "Face avant",
      back: "Face arrière (miroir)",
    },
    cutSide: {
      front: "Face avant",
      back: "Face arrière (miroir)",
    },
    drillMethod: {
      drill: "Foret",
      mill: "Fraise",
    },
  },
}
