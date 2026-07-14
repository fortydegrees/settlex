const MATCH_ALERT_RESUME_LABEL = "Turn match alerts back on";
const MATCH_ALERT_RESUME_ERROR =
  "Could not turn match alerts back on. Try again or continue without alerts.";

const getErrorMessage = (error) => {
  if (typeof error === "string" && error.trim()) return error;
  if (typeof error?.message === "string" && error.message.trim()) {
    return error.message;
  }
  return MATCH_ALERT_RESUME_ERROR;
};

export function shouldOfferMatchAlertResume({
  preference,
  matchID,
  opponentType,
} = {}) {
  return (
    opponentType === "human" &&
    preference?.state === "paused" &&
    Boolean(matchID) &&
    preference?.pausedMatchId === matchID
  );
}

export function getMatchAlertResumeControlState({
  showMatchAlertResume = false,
  matchAlertResumeChecked = true,
  matchAlertResumeError = "",
  matchAlertResumePending = false,
} = {}) {
  const visible = Boolean(showMatchAlertResume);
  const error = visible ? matchAlertResumeError || "" : "";

  return {
    visible,
    checked: visible && Boolean(matchAlertResumeChecked),
    label: MATCH_ALERT_RESUME_LABEL,
    error,
    pending: Boolean(matchAlertResumePending),
    actions: error ? ["Retry", "Continue without alerts"] : [],
  };
}

export function createGameOverModalActionHandlers({
  onClose,
  onViewPostgame,
  onRematch,
  onLobby,
  onRetryMatchAlertResume,
  onContinueWithoutMatchAlerts,
  pending = false,
} = {}) {
  const run = (callback) => () => {
    if (pending) return undefined;
    return callback?.();
  };

  return {
    close: run(onClose),
    viewPostgame: run(onViewPostgame),
    rematch: run(onRematch),
    lobby: run(onLobby),
    retryMatchAlertResume: run(onRetryMatchAlertResume),
    continueWithoutMatchAlerts: run(onContinueWithoutMatchAlerts),
  };
}

export function shouldResumeMatchAlertsForAction({
  action,
  eligible,
  checked,
} = {}) {
  if (!eligible) return false;
  if (action === "retry") return true;
  return action === "return" && Boolean(checked);
}

export async function runGameOverLobbyAction({
  shouldResume,
  resumeMatchAlerts,
  onLobby,
} = {}) {
  if (!shouldResume) {
    await onLobby?.();
    return { returnedToLobby: true, resumed: false };
  }

  try {
    const result = await resumeMatchAlerts?.();
    if (!result?.updated) {
      return {
        returnedToLobby: false,
        resumed: false,
        error: getErrorMessage(result?.error),
      };
    }

    await onLobby?.();
    return { returnedToLobby: true, resumed: true };
  } catch (error) {
    return {
      returnedToLobby: false,
      resumed: false,
      error: getErrorMessage(error),
    };
  }
}
