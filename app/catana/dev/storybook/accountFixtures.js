import {
  HUMAN_GAME_MATCH_ALERT_PAUSE_MESSAGE,
  getMatchAlertDisplayState,
} from "../../matchAlerts/matchAlertState";

const supported = { supported: true, permission: "granted" };

export const guestIdentity = Object.freeze({
  name: "BoldTraderYM",
  emoji: "😉",
  color: "teal",
});

export const savedIdentity = Object.freeze({
  name: "HarbourFox",
  emoji: "🦊",
  color: "orange",
});

export const matchAlertFixtures = Object.freeze({
  off: getMatchAlertDisplayState({
    configured: true,
    capability: supported,
    preference: { state: "off" },
    hasSubscription: false,
  }),
  active: getMatchAlertDisplayState({
    configured: true,
    capability: supported,
    preference: { state: "active" },
    hasSubscription: true,
  }),
  pausedResumable: getMatchAlertDisplayState({
    configured: true,
    capability: supported,
    preference: { state: "paused" },
    currentGame: null,
  }),
  pausedHumanGame: getMatchAlertDisplayState({
    configured: true,
    capability: supported,
    preference: { state: "paused" },
    currentGame: { opponentType: "human" },
  }),
  blocked: getMatchAlertDisplayState({
    configured: true,
    capability: { supported: true, permission: "denied" },
    preference: { state: "off" },
  }),
  unsupported: getMatchAlertDisplayState({
    configured: true,
    capability: { supported: false, reason: "unsupported" },
  }),
  installRequired: getMatchAlertDisplayState({
    configured: true,
    capability: { supported: false, reason: "install_required" },
    enableAttempted: true,
  }),
  unconfigured: getMatchAlertDisplayState({ configured: false }),
});

export const matchAlertErrors = Object.freeze({
  humanGamePaused: HUMAN_GAME_MATCH_ALERT_PAUSE_MESSAGE,
});
