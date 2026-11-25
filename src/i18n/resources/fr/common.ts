import type { UiResources } from "../en"

/** Chaîne partagée par les composants hors d’une zone précise de l’application. */
export const frCommon: UiResources["common"] = {
  name: "Nom",
  pickColor: "Choisir {{label}}",
  unavailable: "{{label}} indisponible",
  problemText: {
    problem: "Problème :",
    suggested: "Suggestion :",
  },
  appearance: {
    saveFailed:
      "Cette apparence est appliquée, mais n’a pas pu être enregistrée. Réessayez.",
    fontSaveFailed:
      "Cette police est appliquée, mais n’a pas pu être enregistrée. Réessayez.",
  },
  workLight: {
    brightnessFailed:
      "La luminosité de l’éclairage de travail n’a pas pu être appliquée",
    saveFailed:
      "Ces préférences d’éclairage de travail sont appliquées, mais n’ont pas pu être enregistrées. Réessayez.",
  },
  fixtureOrigin: {
    origin: "Origine",
    hint: "Le point par lequel il est positionné et autour duquel il tourne",
    selectAria: "Origine de {{name}}",
  },
  referencePoint: {
    relativeTo: "Par rapport à",
    relativeToAria: "Référence de {{label}}",
  },
  toolCard: {
    choose: "Choisir un outil",
    openLibrary: "Ouvrir la bibliothèque d’outils",
    touchProbe: "Sonde de touch-off",
    size_one: "Ø {{diameter}} mm · {{count}} goujure",
    size_other: "Ø {{diameter}} mm · {{count}} goujures",
    selected: "Outil sélectionné",
  },
  camera: {
    title: "Caméra",
    region: "Caméra de la machine",
    live: "En direct",
    connectingBadge: "Connexion",
    start: "Démarrer",
    stop: "Arrêter",
    retry: "Réessayer",
    startAria: "Démarrer la caméra",
    stopAria: "Arrêter la caméra",
    retryAria: "Relancer la caméra",
    stopped: "Caméra arrêtée",
    connecting: "Connexion à la caméra…",
    unavailable: "Caméra indisponible",
    offline: "Caméra hors ligne",
    fullscreen: "Plein écran",
    fullscreenUnavailable: "Plein écran indisponible",
    fullscreenAria: "Caméra en plein écran",
    liveAlt: "Caméra de la machine en direct",
  },
  heightMap: {
    region: "Valeurs de la carte de hauteurs",
    relativeHeight: "Hauteur relative · mm",
    offsets: "Décalages X / Y depuis le départ de la grille · mm",
    indices: "Indices de ligne / colonne · espacement indisponible",
    axes: "Y / X",
    rowCol: "Ligne / Col",
    unmeasured: "Non mesuré",
    outlier: "Valeur aberrante",
    outlierSuffix: " · Valeur aberrante",
    positionAxes: "X {{x}} · Y {{y}} mm",
    positionIndex: "Ligne {{row}} · Colonne {{column}}",
    cellTitle: "{{position}} : {{value}}",
    legend: "Bleu − · Orange +",
    legendOutlier: " · Rouge : valeur aberrante",
    measured_one: "{{measured}} / {{total}} mesurée",
    measured_other: "{{measured}} / {{total}} mesurées",
  },
  bedViewer: {
    region: "Plaques 3D interactives et parcours d’outil NC",
    selectPlate: "Sélectionner {{label}}",
    error: "Erreur",
    warning: "Avertissement",
    problemAria: "{{severity}} : {{message}}",
  },
}
