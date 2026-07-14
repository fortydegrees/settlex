const state = ({ status, label, detail, action = null, actionLabel = null }) => ({
  status,
  label,
  detail,
  action,
  actionLabel,
});

const OFF = state({
  status: "off",
  label: "Get match alerts",
  detail: "We’ll let you know when another player is looking for a duel.",
  action: "enable",
  actionLabel: "Enable",
});

export function getMatchAlertDisplayState({
  configured,
  capability,
  permission = capability?.permission,
  preference,
  hasSubscription,
  enableAttempted = false,
} = {}) {
  if (!configured) {
    return state({
      status: "unconfigured",
      label: "Match alerts are unavailable",
      detail: "This SettleHex server is not configured for browser alerts.",
    });
  }

  if (capability?.reason === "install_required") {
    if (!enableAttempted) return { ...OFF };
    return state({
      status: "install_required",
      label: "Add SettleHex to your Home Screen",
      detail:
        "In Safari, tap Share, then Add to Home Screen. Open SettleHex there to enable match alerts.",
    });
  }

  if (!capability?.supported) {
    return state({
      status: "unsupported",
      label: "Match alerts are not supported in this browser",
      detail: "You can keep looking for a player without browser alerts.",
    });
  }

  if (permission === "denied" || capability.reason === "blocked") {
    return state({
      status: "blocked",
      label: "Notifications blocked in browser settings",
      detail: "Allow notifications for SettleHex in your browser settings.",
    });
  }

  if (preference?.state === "paused") {
    return state({
      status: "paused",
      label: "Match alerts paused during your game",
      detail: "They can resume after your human game ends.",
    });
  }

  if (preference?.state === "active" && hasSubscription) {
    return state({
      status: "active",
      label: "Match alerts on",
      detail: "This browser will alert you when someone is looking for a duel.",
      action: "disable",
      actionLabel: "Disable",
    });
  }

  return { ...OFF };
}

export const getMatchAlertState = getMatchAlertDisplayState;
