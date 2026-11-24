import type { UiResources } from "../en"

export const frJob: UiResources["job"] = {
  status: {
    upNext: "À suivre",
    running: "En cours",
    waiting: "En attente",
    done: "Terminé",
    failed: "Échoué",
    stopped: "Arrêté",
    notRun: "Non exécuté",
  },
  list: {
    aria: "Étapes du travail",
  },
  checks: {
    title: "Vérifications",
    passedAt: "Réussies avant le lancement à {{time}}.",
  },
  upload: {
    title: "Envoi",
    description:
      "Le programme est écrit dans le stockage de la machine puis relu avant son démarrage.",
    parts_one: "{{size}} envoyé en {{count}} partie, relu.",
    parts_other: "{{size}} envoyé en {{count}} parties, relues.",
    single: "{{size}} envoyé et relu.",
  },
  finish: {
    title: "Fin",
    description:
      "Le travail se termine quand la machine confirme la fin du programme.",
    finishingTitle: "Fin",
    finishingDescription:
      "Les derniers blocs s’exécutent. Le travail se termine quand la machine le confirme.",
    cleaningTitle: "Nettoyage du plateau",
    cleaningDescription:
      "Le nettoyage du plateau s’exécute après le programme. Le travail se termine quand la machine le signale terminé.",
    overdue:
      "Cela prend plus de temps que prévu. Le travail reste suivi ; vérifiez la machine.",
  },
  running: {
    machineRuns: "La machine exécute le programme ; la timeline suit sa ligne.",
  },
  summary: {
    at: "au niveau de",
    anchorFallback: "son ancrage",
    noPlate: "Aucune plaque",
    runAt: "Lancement à {{time}}",
    startedElsewhere:
      "Démarré hors de cette fenêtre ; sa plaque est inconnue ici.",
    grid: "Sonde {{columns}} × {{rows}} points sur {{width}} × {{depth}} mm.",
    outlineToolpath:
      "Suit les limites du parcours d’outil de la plaque avec la pointe de la sonde.",
    outlineEdges: "Suit {{names}} avec la pointe de la sonde.",
    missingEdge: "un bord {{side}} manquant",
    noToolChange: "{{kind}} sans changement d’outil.",
    touchOff: {
      touchesTop: "Touche le dessus de la matière",
      belowProbe: "sous la sonde",
      setsWorkZ: "et définit le",
      there: "à cet endroit.",
    },
    origin: {
      finds: "Repère",
      from: "depuis",
      fromProbe: "depuis la position de la sonde",
      at: "au point",
      setsOrigin: "et définit l’origine de travail à cet endroit.",
    },
  },
  grid: {
    probing: "La machine sonde la grille.",
    failed: "La machine n’a pas pu terminer la grille.",
    completed: "La machine a mesuré la grille et compense le Z en conséquence.",
  },
  probe3d: {
    acrossXY: "X et Y",
    outsideCorner: "le coin {{corner}}",
    insideCorner: "le coin intérieur {{corner}}",
    pocketCenter: "le centre de la poche en {{axes}}",
    bossCenter: "le centre du bossage en {{axes}}",
    probing: "La machine sonde {{target}}.",
    stoppedBefore:
      "La machine a cessé de sonder {{target}} avant de le trouver.",
    noContacts:
      "La machine n’a pas signalé tous les contacts de la routine ; l’endroit où elle a trouvé {{target}} est inconnu.",
    featureCorner: "coin",
    featureCenter: "centre",
    foundIntro: "{{feature}} trouvé : origines",
    foundThere: "définies là, en machine",
    foundAnd: "et",
    foundOnTop: "sur le dessus touché",
  },
  facts: {
    top: "Dessus",
    pocket: "Poche",
    boss: "Bossage",
    contacts: "Contacts",
    stockTop: "Dessus de la matière",
    grid: "Grille",
    measured: "Mesurés",
    range: "Écart",
  },
  sensor: {
    probeAtSensor: "Sonde au capteur",
    probe3dAtSensor: "Sonde 3D au capteur",
    toolAtSensor: "Outil au capteur",
    toolNAtSensor: "T{{tool}} au capteur",
  },
  touch: {
    atMachine: "Dessus de la matière touché en machine",
    work: "travail",
    setWork: "et Z de travail à",
    there: "défini à cet endroit.",
    g38Only:
      "La machine ne transmet pas la mesure de ce toucher : elle touche avec G38.2.",
    anchorOnly:
      "La machine ne transmet ses mesures que lorsqu’elle sonde depuis un ancrage enregistré, l’origine de travail restant relative à celui-ci.",
  },
  transfer: {
    preparingTitle: "Préparation de la machine",
    preparingDescription:
      "Vérification de la prise d’origine et de l’état de la machine, puis application des aides de la plaque.",
    uploadingTitle: "Envoi du programme",
    uploadingDescription:
      "Le programme est écrit dans le stockage de la machine.",
    uploadingPart: "Envoi de {{part}}",
    partsDescription:
      "Le programme est trop volumineux pour un seul fichier ; il est envoyé en parties coupées à ses changements d’outil. Chaque partie est écrite dans le stockage de la machine avant la lecture de la première.",
    verifyingTitle: "Vérification de l’envoi",
    verifyingDescription:
      "Chaque octet est relu et comparé avant le démarrage du programme.",
    verifyingPart: "Vérification de {{part}}",
    startingTitle: "Démarrage du programme",
    startingDescription:
      "En attente que la machine signale le programme en cours d’exécution.",
    progressAria: "Progression de l’envoi",
  },
  outcome: {
    completedTitle: "Travail terminé",
    completedDescription: "La machine a signalé la fin du programme.",
    stoppedTitle: "Travail arrêté",
    stoppedDescription:
      "Arrêt a stoppé la machine. Faites sa prise d’origine dans l’onglet Périphérique avant le prochain travail.",
    failedTitle: "Travail interrompu",
    failedDescription: "La machine a interrompu le programme.",
    unverifiedTitle: "Fin non vérifiée",
    unverifiedDescription:
      "La machine n’a pas confirmé comment le programme s’est terminé. Vérifiez la machine avant de relancer.",
    lostTitle: "Connexion perdue",
    lostDescription:
      "Le travail est peut-être encore en cours sur la machine. Vérifiez-la avant de vous reconnecter.",
    stopHint:
      "Arrêt a stoppé la machine. Faites sa prise d’origine dans l’onglet Périphérique avant le prochain travail.",
  },
  part: {
    of: "Partie {{number}} sur {{count}}",
  },
  phase: {
    noJob: "Aucun travail",
    preparing: "Préparation",
    uploading: "Envoi",
    stepPart: "{{step}} {{part}}",
    verifying: "Vérification",
    starting: "Démarrage",
    running: "En cours",
    toolChange: "Changement d’outil",
    installTool: "Monter T{{tool}}",
    reviewHeightMap: "Revoir la carte de hauteur",
    pausedBeforeOperation: "Pause avant l’opération",
    programPause: "Pause du programme",
    paused: "En pause",
    cleaningBed: "Nettoyage du plateau",
    finishing: "Fin",
    completed: "Terminé",
    stopped: "Arrêté",
    failed: "Interrompu",
    unverified: "Fin non vérifiée",
    lost: "Connexion perdue",
  },
  progress: {
    aria: "Progression du programme",
    lineOf: "Ligne {{line}} sur {{total}}",
  },
  faults: {
    title_one: "La machine a signalé une erreur",
    title_other: "La machine a signalé {{count}} erreurs",
    line: "Ligne {{line}} : ",
  },
  machine: {
    unavailable: "Indisponible.",
  },
  check: {
    device: "Périphérique connecté",
    program: "La plaque compile",
    tools: "Outils assignés",
    operations: "Opérations à jour",
    designRules: "Règles de conception respectées",
    matchesMachine: "La plaque correspond à la machine",
    transfer: "Le programme est transférable",
    machine: "Machine prête",
    connecting: "Connexion…",
    connectFirst: "Connectez d’abord un périphérique.",
    waitsForPlate: "En attente d’une plaque.",
    waitsForDevice: "En attente d’un périphérique connecté.",
    waitsForCompiled: "En attente d’une plaque qui compile.",
    checkingProgram:
      "Vérification du programme selon le dialecte de la machine…",
    machineCannotStart:
      "La machine ne peut pas démarrer de programme pour le moment.",
    notYet: "pas encore.",
    blocker: "{{label}} : {{reason}}",
    more: "(+{{count}} de plus)",
    errors_one: "{{count}} erreur",
    errors_other: "{{count}} erreurs",
    warnings_one: "{{count}} avertissement",
    warnings_other: "{{count}} avertissements",
    sentParts_one:
      "Envoyé en {{count}} partie, coupée aux changements d’outil ; chaque partie est envoyée avant la lecture de la première.",
    sentParts_other:
      "Envoyé en {{count}} parties, coupées aux changements d’outil ; chaque partie est envoyée avant la lecture de la première.",
    linesAdjusted:
      "{{lines}} lignes ajustées pour la machine ; voir la liste G-code.",
    passes: "Réussie",
    fails: "Échouée",
    waiting: "En attente",
    passesWithWarning: "Réussie avec un avertissement",
    problemsAria: "{{label}} : problèmes",
    errorAria: "Erreur",
    warningAria: "Avertissement",
    preflight: "Vérifications préalables",
    preflightReady: "Vérifications préalables : prêt à lancer",
    preflightWaiting:
      "Le lancement devient disponible quand toutes les vérifications réussissent.",
    preflightParts:
      "Le lancement envoie le G-code listé à droite en {{parts}} parties, coupées à ses changements d’outil.",
    preflightExact: "Le lancement envoie exactement le G-code listé à droite.",
    todoAria: "Vérifications de lancement à faire",
    passedAria: "Vérifications de lancement réussies",
    allPass_one: "Les {{count}} vérification réussit",
    allPass_other: "Les {{count}} vérifications réussissent",
    morePass_one: "{{count}} vérification de plus réussit",
    morePass_other: "{{count}} vérifications de plus réussissent",
  },
  fix: {
    openDevice: "Ouvrir le périphérique",
    openPrepare: "Ouvrir Préparer",
    openOperation: "Ouvrir l’opération",
    connect: "Connecter",
    showInPrepare: "Voir dans Préparer",
    readingAnchors: "Lecture des ancrages…",
  },
}
