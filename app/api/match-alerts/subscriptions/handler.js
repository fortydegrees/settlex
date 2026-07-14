import { NextResponse } from "next/server";
import { getSessionAccount } from "../../../../lib/server/accounts/getSessionAccount.js";
import {
  deleteMatchAlertSubscription,
  upsertMatchAlertSubscription,
} from "../../../../lib/server/matchAlerts/matchAlertStore.js";
import { isSafePushEndpoint } from "../../../../lib/server/matchAlerts/pushEndpointSecurity.js";

const MAX_INPUT_LENGTH = 4096;

const unauthorizedResponse = () =>
  NextResponse.json(
    { error: "You must create or restore an account first." },
    { status: 401 }
  );

const invalidSubscriptionResponse = () =>
  NextResponse.json({ error: "Invalid push subscription." }, { status: 400 });

const errorResponse = (error) =>
  NextResponse.json(
    { error: error?.message ?? "Failed to update push subscription." },
    { status: error?.status ?? 500 }
  );

const validInput = (value) =>
  typeof value === "string" &&
  value.trim().length > 0 &&
  value.length <= MAX_INPUT_LENGTH;

const validHttpsEndpoint = (endpoint) =>
  validInput(endpoint) && isSafePushEndpoint(endpoint);

const getAccount = async (request, getSessionAccountImpl) => {
  const sessionAccount = await getSessionAccountImpl({
    cookieHeader: request.headers.get("cookie") ?? "",
  });
  return sessionAccount?.account ?? null;
};

export const createMatchAlertSubscriptionPostRoute =
  ({
    getSessionAccount: getSessionAccountImpl = getSessionAccount,
    upsertMatchAlertSubscription:
      upsertMatchAlertSubscriptionImpl = upsertMatchAlertSubscription,
  } = {}) =>
  async (request) => {
    try {
      const account = await getAccount(request, getSessionAccountImpl);
      if (!account) return unauthorizedResponse();

      const subscription = await request.json();
      if (
        !validHttpsEndpoint(subscription?.endpoint) ||
        !validInput(subscription?.keys?.p256dh) ||
        !validInput(subscription?.keys?.auth)
      ) {
        return invalidSubscriptionResponse();
      }

      return NextResponse.json({
        subscription: await upsertMatchAlertSubscriptionImpl({
          accountId: account.id,
          subscription: {
            endpoint: subscription.endpoint,
            keys: {
              p256dh: subscription.keys.p256dh,
              auth: subscription.keys.auth,
            },
          },
        }),
      });
    } catch (error) {
      return errorResponse(error);
    }
  };

export const createMatchAlertSubscriptionDeleteRoute =
  ({
    getSessionAccount: getSessionAccountImpl = getSessionAccount,
    deleteMatchAlertSubscription:
      deleteMatchAlertSubscriptionImpl = deleteMatchAlertSubscription,
  } = {}) =>
  async (request) => {
    try {
      const account = await getAccount(request, getSessionAccountImpl);
      if (!account) return unauthorizedResponse();

      const { endpoint } = await request.json();
      if (!validHttpsEndpoint(endpoint)) return invalidSubscriptionResponse();

      await deleteMatchAlertSubscriptionImpl({
        accountId: account.id,
        endpoint,
      });
      return NextResponse.json({ ok: true });
    } catch (error) {
      return errorResponse(error);
    }
  };

export const POST = createMatchAlertSubscriptionPostRoute();
export const DELETE = createMatchAlertSubscriptionDeleteRoute();
