import type { UiResources } from "../en"

export const frSettings: UiResources["settings"] = {
  title: "Réglages",
  sections: {
    general: "Général",
    pcb: "PCB",
    privacy: "Confidentialité",
  },
  couldNotSave: "Ce réglage n’a pas pu être enregistré : {{message}}",
  language: {
    label: "Langue",
    hint: "La langue de l’interface de l’application. Système suit la langue de votre ordinateur. Les menus que macOS dessine lui-même, comme Couper et Copier du menu Édition, suivent la langue de votre ordinateur.",
    optionSystem: "Système",
    optionEnglish: "Anglais",
    optionFrench: "Français",
  },
  appearance: {
    label: "Mode d’affichage",
    hint: "Système suit l’apparence claire ou sombre de votre Mac.",
    optionSystem: "Système",
    optionLight: "Clair",
    optionDark: "Sombre",
  },
  displayFont: { label: "Police d’affichage", hint: "La police du texte." },
  monoFont: {
    label: "Police mono",
    hint: "La police du G-code et des chiffres des valeurs affichées.",
  },
  simulator: {
    label: "Périphérique Z1 simulé",
    hint: "Un Makera Z1 simulé qu’OpenSpindle fait tourner sur {{host}}:{{port}}, pour essayer des travaux sans machine. On s’y connecte comme à une machine.",
    notRunning: "Le simulateur ne tourne pas. {{error}}",
  },
  privacy: {
    debugLevel: "Niveau de journal",
    debugLevelHint:
      "Ce que le journal enregistre (Aide › Exporter le journal…). Debug enregistre le plus, pour remonter à un problème.",
    levelError: "Erreur",
    levelWarning: "Avertissement",
    levelInfo: "Info",
    levelDebug: "Debug",
    autoReports: "Envoyer les rapports d’erreur automatiquement",
    autoReportsHint:
      "Les erreurs partent vers les développeurs d’OpenSpindle au moment où elles surviennent, avec la version de l’application, votre système et ce qui les a déclenchées, jamais vos projets. Sinon vous choisissez dans la boîte de dialogue d’erreur.",
  },
  pcb: {
    executable: "Exécutable pcb2gcode",
    automaticDetection: "Détection automatique",
    checking: "Vérification de pcb2gcode…",
    choose: "Choisir l’exécutable",
    checkingShort: "Vérification…",
    checkAgain: "Revérifier",
    useAutomatic: "Utiliser la détection automatique",
  },
}
