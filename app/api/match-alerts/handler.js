import { NextResponse } from "next/server";
import { getSessionAccount } from "../../../lib/server/accounts/getSessionAccount.js";
import { canResumePausedMatch } from "../../../lib/server/matchAlerts/humanMatchAlertPause.js";
import {
  getMatchAlertPreference,
  setMatchAlertEnabled,
} from "../../../lib/server/matchAlerts/matchAlertStore.js";
import { getWebPushConfig } from "../../../lib/server/matchAlerts/webPushConfig.js";

const unauthorizedResponse = () =>
  NextResponse.json(
    { error: "You must create or restore an account first." },
    { status: 401 }
  );

const errorResponse = (error) =>
  NextResponse.json(
    { error: error?.message ?? "Failed to update match alerts." },
    { status: error?.status ?? 500 }
  );

const getAccount = async (request, getSessionAccountImpl) => {
  const sessionAccount = await getSessionAccountImpl({
    cookieHeader: request.headers.get("cookie") ?? "",
  });
  return sessionAccount?.account ?? null;
};

export const createMatchAlertsGetRoute =
  ({
    getSessionAccount: getSessionAccountImpl = getSessionAccount,
    getMatchAlertPreference: getMatchAlertPreferenceImpl = getMatchAlertPreference,
    getWebPushConfig: getWebPushConfigImpl = getWebPushConfig,
  } = {}) =>
  async (request) => {
    try {
      const account = await getAccount(request, getSessionAccountImpl);
      if (!account) return unauthorizedResponse();

      const config = getWebPushConfigImpl();
      return NextResponse.json({
        configured: config.configured,
        vapidPublicKey: config.publicKey,
        preference: await getMatchAlertPreferenceImpl({ accountId: account.id }),
      });
    } catch (error) {
      return errorResponse(error);
    }
  };

export const createMatchAlertsPatchRoute =
  ({
    getSessionAccount: getSessionAccountImpl = getSessionAccount,
    getMatchAlertPreference: getMatchAlertPreferenceImpl = getMatchAlertPreference,
    canResumePausedMatch: canResumePausedMatchImpl = canResumePausedMatch,
    setMatchAlertEnabled: setMatchAlertEnabledImpl = setMatchAlertEnabled,
  } = {}) =>
  async (request) => {
    try {
      const account = await getAccount(request, getSessionAccountImpl);
      if (!account) return unauthorizedResponse();

      const { action } = await request.json();
      if (action === "disable") {
        return NextResponse.json({
          preference: await setMatchAlertEnabledImpl({
            accountId: account.id,
            enabled: false,
          }),
        });
      }

      if (action === "enable" || action === "resume") {
        const current = await getMatchAlertPreferenceImpl({ accountId: account.id });
        if (current.state === "paused") {
          const canResume = await canResumePausedMatchImpl({
            matchID: current.pausedMatchId,
          });
          if (!canResume) {
            return NextResponse.json(
              { error: "Match alerts stay paused until your human game ends." },
              { status: 409 }
            );
          }
        }
        return NextResponse.json({
          preference: await setMatchAlertEnabledImpl({
            accountId: account.id,
            enabled: true,
          }),
        });
      }

      return NextResponse.json(
        { error: "Invalid match-alert action." },
        { status: 400 }
      );
    } catch (error) {
      return errorResponse(error);
    }
  };

export const GET = createMatchAlertsGetRoute();
export const PATCH = createMatchAlertsPatchRoute();
