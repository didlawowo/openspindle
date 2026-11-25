import type { UiResources } from "../en"

export const frProbing: UiResources["probing"] = {
  fields: {
    workArea: "Zone d'usinage",
    picking: "Sélection dans la vue 3D…",
    probePosition: "Position du palpeur",
    unavailableAnchor: "Ancrage indisponible",
    placement: "Placement",
    pickIn3d: "Sélectionner dans la vue 3D",
  },
  strategies: {
    "outside-corner": {
      label: "Coin extérieur",
      description:
        "Trouver un coin extérieur de la matière et y définir l'origine pièce.",
    },
    "inside-corner": {
      label: "Coin intérieur",
      description: "Trouver un coin intérieur et y définir l'origine pièce.",
    },
    "pocket-center": {
      label: "Centre de poche",
      description:
        "Trouver le centre d'une poche ou d'un alésage et y définir X et Y pièce.",
    },
    "boss-center": {
      label: "Centre de bossage",
      description:
        "Trouver le centre d'un bossage, comme la matière elle-même, et y définir l'origine pièce.",
    },
    "touch-off": {
      label: "Surface Z",
      description:
        "Palper la surface supérieure de la matière et y définir Z pièce.",
    },
    "height-map": {
      label: "Carte de hauteurs",
      description:
        "Palper une grille de hauteurs sur la surface de la matière ; la machine compense ensuite les découpes.",
    },
    "outline-trace": {
      label: "Contour",
      description:
        "Tracer les bords de la zone d'usinage de la plaque avant de couper.",
    },
  },
  params: {
    width: { label: "Largeur" },
    depth: { label: "Profondeur" },
    xPoints: { label: "Points de palpage X" },
    yPoints: { label: "Points de palpage Y" },
    gridClearance: {
      label: "Hauteur de dégagement",
      description:
        "Valeur H du firmware après le premier contact avec la surface ; pas une position Z initiale absolue.",
    },
    distanceX: {
      label: "Distance X",
      description:
        "Distance que le palpeur parcourt en X depuis son point de départ, puis redescend et se rabat : au-delà du côté d'un coin, ou d'un bossage, ce qui demande plus de la moitié du bossage plus le rayon de la boule. Le centrage d'une poche cherche cette distance de chaque côté.",
    },
    distanceY: {
      label: "Distance Y",
      description:
        "Distance que le palpeur parcourt en Y depuis son point de départ, puis redescend et se rabat : au-delà du côté d'un coin, ou d'un bossage, ce qui demande plus de la moitié du bossage plus le rayon de la boule. Le centrage d'une poche cherche cette distance de chaque côté.",
    },
    probeDepth: {
      label: "Profondeur de palpage",
      description:
        "Distance sous le haut, que le palpeur touche d'abord, où il touche les côtés.",
    },
    probeTravel: {
      label: "Course de palpage",
      description:
        "Distance que le palpeur cherche vers le bas avant que la machine s'alarme. Après un changement de palpeur, ou la course vers un ancrage, il démarre près du haut de la course Z.",
    },
    touchClearance: {
      label: "Hauteur de dégagement",
      description:
        "Remontée au-dessus de la surface palpée une fois Z pièce défini.",
    },
    machineZ: {
      label: "Z machine",
      description:
        "Z machine absolu où le palpeur trace, dégagé de la matière et des montages. Makera configure le dégagement du Z1 à -3.",
    },
    traceFeed: {
      label: "Avance de traçage",
      description: "Vitesse à laquelle le laser du palpeur suit le contour.",
    },
  },
  corners: {
    "front-left": "Avant-gauche",
    "front-right": "Avant-droit",
    "back-left": "Arrière-gauche",
    "back-right": "Arrière-droit",
  },
  axes: {
    xy: "X et Y",
    x: "X seul",
    y: "Y seul",
  },
  routines: {
    "outside-corner": "Coin extérieur",
    "inside-corner": "Coin intérieur",
    "pocket-center": "Centre de poche",
    "boss-center": "Centre de bossage",
  },
  grid: {
    legend: "Grille de palpage",
    fit: "Ajuster la grille",
    span: "X de {{minX}} à {{maxX}} et Y de {{minY}} à {{maxY}} mm depuis l'origine pièce.",
    cutsCover: "Les découpes couvrent {{span}}",
    stockCovers:
      "La plaque n'a pas d'opérations d'usinage ; sa matière couvre {{span}}",
    fitCutsAnchors:
      "{{extent}} {{action}} dimensionne la grille sur elles et ancre son départ à leur coin inférieur gauche.",
    fitStockAnchors:
      "{{extent}} {{action}} dimensionne la grille sur la matière et ancre son départ au coin inférieur gauche de la matière.",
    fitNoAnchors:
      "{{extent}} Sans ancrages enregistrés, {{action}} ne fait que dimensionner la grille : placez le palpeur au-dessus de X {{minX}} Y {{minY}}.",
    review: "Vérifier après palpage",
    reviewHint:
      "Faire une pause après le palpage pour vérifier la carte de hauteurs mesurée, puis Reprendre ou Arrêter.",
  },
  origin: {
    corner: "Coin",
    axes: "Axes",
  },
  touch: {
    legend: "Touch-off",
    hint: "La surface palpée devient Z0 pièce, et l'origine pièce de la plaque reste sur le dessus de la matière.",
    center: "Centrer",
    middleCuts:
      "Le milieu des découpes est X {{x}} Y {{y}} depuis l'origine pièce.",
    middleStock:
      "La plaque n'a pas d'opérations d'usinage ; le milieu de sa matière est X {{x}} Y {{y}} depuis l'origine pièce.",
    centerAnchors:
      "{{middle}} {{action}} palpe là, par rapport à un ancrage enregistré.",
    centerNoAnchors:
      "{{middle}} Sans ancrages enregistrés, placez le palpeur là avant Lancer.",
    centerNeedsAnchors:
      "Centrer a besoin des ancrages enregistrés du périphérique de la plaque.",
  },
  outline: {
    legend: "Contour",
    trace: "Tracer",
    traceHint:
      "Limites du parcours d'outil : le rectangle que les découpes de la plaque couvrent, depuis l'origine pièce. Bords : bords choisis de la matière et des montages, là où le montage de la plaque les place, depuis le premier ancrage du périphérique, avec ou sans usinage.",
    edgesDescription:
      "Trace les bords choisis là où le montage de la plaque les place, en coordonnées machine depuis le premier ancrage du périphérique, quels que soient X et Y pièce.",
    targetToolpath: "Limites du parcours d'outil",
    targetEdges: "Bords",
    nothingToTrace: "Rien à tracer : {{reason}}",
    tracesSpan:
      "Trace X de {{x0}} à {{x1}} et Y de {{y0}} à {{y1}} mm depuis l'origine pièce : là où les découpes de la plaque usinent, dessiné dans la vue 3D.",
    tracedEdges: "Bords tracés",
    missingEdge: "Bord manquant · {{side}}",
    remove: "Retirer {{label}}",
    pickEdges: "Sélectionner les bords",
    stockOutline: "Contour de la matière",
    noStock: "La plaque n'a pas de matière.",
    pause: "Pause après traçage",
    pauseHint:
      "Faire une pause après le traçage pour vérifier le contour contre la matière et les montages, puis Reprendre ou Arrêter.",
  },
  review: {
    flat: "La surface est plane",
    uneven: "La surface est irrégulière",
    unreliable: "Vérifiez le palpage avant de reprendre",
    grid: "Grille",
    measured: "Mesuré",
    outliers: "Valeurs aberrantes",
    minimum: "Minimum",
    maximum: "Maximum",
    mean: "Moyenne",
    range: "Étendue",
    tilt: "Inclinaison",
    flatness: "Planéité",
    probedExpected: " · palpé {{columns}} × {{rows}}",
    reading: "Lecture de la carte de hauteurs…",
    readingHint: "M375.1 transmet les hauteurs mesurées par le firmware.",
    readFailed: "La carte de hauteurs n'a pas pu être lue",
    none: "Pas encore de carte de hauteurs",
    noneHint: "Lisez la carte de hauteurs pour vérifier le palpage.",
    aria: "Vérification de la carte de hauteurs",
    title: "Vérifier la carte de hauteurs",
    description:
      "Le travail est en pause après le palpage. Vérifiez les hauteurs mesurées, puis Reprendre pour continuer ou Arrêter.",
    readAt: "Lue à",
    retryAria: "Relancer la lecture de la carte de hauteurs",
    retrying: "Lecture…",
    retry: "Relire",
  },
  tools: {
    touchesZ: "Touche Z",
    touchesXYZ: "Touche X Y Z",
    touchesWithPointer: "{{touches}} · pointeur laser",
    inNumber: "{{name}} dans T{{number}}",
    missingTool: "un outil absent de la bibliothèque",
    stranded_one: "{{names}} ne peut pas l'utiliser",
    stranded_other: "{{names}} ne peuvent pas l'utiliser",
    replacesShared_one:
      "Remplace {{entry}}, que {{count}} autre opération utilise.",
    replacesShared_other:
      "Remplace {{entry}}, que {{count}} autres opérations utilisent.",
  },
}
